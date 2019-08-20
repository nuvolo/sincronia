import {Sinc} from "@sincronia/types";
import sanitizePlugin from "./sanitizer";
export default function() {
  return {
    plugins: [sanitizePlugin]
  };
}
