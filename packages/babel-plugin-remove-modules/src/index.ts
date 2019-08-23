import { Sinc } from "@sincronia/types";
import { PluginItem, NodePath } from "@babel/core";
import * as t from "@babel/types";
export default function() {
  function shouldProcessImport(path: NodePath<t.ImportDeclaration>) {
    let n = path.node;
    if (n.leadingComments && n.leadingComments.length > 0) {
      let comments = n.leadingComments;
      for (let c of comments) {
        let keepComment = /@keepModule/;
        if (keepComment.test(c.value)) {
          return false;
        }
      }
    }
    return true;
  }
  let count = 0;
  return {
    visitor: {
      //remove imports
      ImportDeclaration(path) {
        //determine if we should process this import
        let shouldProcess = shouldProcessImport(path);
        //get a list of imports
        let _imports = path.node.specifiers.reduce(
          (acc, cur) => {
            if (cur.type === "ImportSpecifier") {
              acc.push(cur.imported.name);
            }
            if (cur.type === "ImportDefaultSpecifier") {
              acc.push(cur.local.name);
            }
            return acc;
          },
          [] as string[]
        );
        //get module name
        let mod = path.node.source.value;
        //rename references to module unless they are local modules
        for (let i of _imports) {
          if (!isLocal(mod) && shouldProcess) {
            path.scope.rename(i, [mod, i].join("."));
          }
        }
        if (shouldProcess) {
          path.remove();
        }
        function isLocal(moduleName: string) {
          let reg = /\./;
          return reg.test(moduleName);
        }
      },
      ExportNamedDeclaration(path) {
        if (path.node.declaration) {
          path.replaceWith(path.node.declaration);
        } else {
          path.remove();
        }
      },
      ExportDefaultDeclaration(path) {
        let type = path.node.declaration.type;
        if (type === "FunctionDeclaration") {
          //anonymous function
          if (!(path.node.declaration as t.FunctionDeclaration).id) {
            (path.node.declaration as t.FunctionDeclaration).id = t.identifier(
              "__ANON__" + count
            );
            count++;
          }
          //named function
          else {
            path.replaceWith(path.node.declaration);
          }
          return;
        }
        if (type === "Identifier") {
          path.remove();
          return;
        }
        if (type === "ClassDeclaration") {
          if (!(path.node.declaration as t.ClassDeclaration).id) {
            (path.node.declaration as t.ClassDeclaration).id = t.identifier(
              "__ANON__" + count
            );
            count++;
          } else {
            path.replaceWith(path.node.declaration);
          }
          return;
        }
        //fallback remove it
        path.remove();
      }
    }
  } as PluginItem;
}
