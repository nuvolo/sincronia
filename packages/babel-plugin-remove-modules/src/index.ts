import { PluginItem } from "@babel/core";
import * as t from "@babel/types";
export default function() {
  let count = 0;
  return {
    visitor: {
      ImportDeclaration(path) {
        path.remove();
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
