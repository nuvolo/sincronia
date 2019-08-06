import { PluginItem } from "@babel/core";
import * as t from "@babel/types";
import { isReservedWord } from "./sanitizerHelper";
export default function() {
  return {
    visitor: {
      AssignmentExpression(path) {
        if (path.node.left.type === "MemberExpression") {
          let left = path.node.left;
          if (left.property.type === "Identifier") {
            let id = left.property;
            if (id.name === "__proto__") {
              path.remove();
            }
          }
        }
      },
      Identifier(path) {
        //replaces references to __proto__, illegal in SN
        if (path.node.name === "__proto__") {
          path.node.name = "prototype";
        }
      },
      //if a reserved word is used as a property, move it to a bracket syntax
      MemberExpression(path) {
        if (
          path.node.property.type === "Identifier" &&
          isReservedWord(path.node.property.name) &&
          !path.node.computed
        ) {
          let replacement = t.memberExpression(
            path.node.object,
            t.stringLiteral(path.node.property.name),
            true
          );
          path.replaceWith(replacement);
        }
      },
      CallExpression(path) {
        //babel creates a function called '_classCallCheck' that gets run when classes get called, however it breaks inheritance in SN so we get rid of it.
        if (
          path.node.callee.type === "Identifier" &&
          path.node.callee.name === "_classCallCheck"
        ) {
          path.remove();
        }
      }
    }
  } as PluginItem;
}
