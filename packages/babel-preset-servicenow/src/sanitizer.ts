import { PluginItem } from "@babel/core";
import * as t from "@babel/types";
import { isReservedWord } from "./sanitizerHelper";
export default function() {
  return {
    visitor: {
      Identifier(path) {
        //replaces references to __proto__, illegal in SN
        if (path.node.name === "__proto__") {
          path.node.name = "__proto_sn__";
        }
      },
      //if a reserved word is used as a property, move it to a bracket syntax
      MemberExpression(path) {
        if (
          path.node.property.type === "Identifier" &&
          isReservedWord(path.node.property.name) &&
          !path.node.computed
        ) {
          const replacement = t.memberExpression(
            path.node.object,
            t.stringLiteral(path.node.property.name),
            true
          );
          path.replaceWith(replacement);
        }
      },
      //remove use strict
      Program: {
        exit: function exit(path) {
            const list = path.node.directives;
            for(let i=list.length-1, it; i>=0 ; i--){
                it = list[i];
                if (it.value.value==='use strict'){
                    list.splice(i,1);
                }
            }
        }
      }
    }
  } as PluginItem;
}
