import type {
  DOMConversionMap,
  DOMConversionOutput,
  EditorConfig,
  LexicalNode,
  NodeKey,
  SerializedTextNode,
} from "lexical";

import { $applyNodeReplacement, TextNode } from "lexical";

export class AutocompleteNode extends TextNode {
  __uuid: string;

  static getType(): string {
    return "autocomplete";
  }

  static clone(node: AutocompleteNode): AutocompleteNode {
    return new AutocompleteNode(node.__text, node.__uuid, node.__key);
  }

  constructor(text: string, uuid: string, key?: NodeKey) {
    super(text, key);
    this.__uuid = uuid;
  }

  createDOM(config: EditorConfig): HTMLElement {
    const element = super.createDOM(config);
    element.style.opacity = "0.5";
    element.style.color = "hsl(var(--muted-foreground))";
    element.style.fontStyle = "italic";
    element.setAttribute("data-lexical-autocomplete", "true");
    return element;
  }

  updateDOM(prevNode: this, dom: HTMLElement, config: EditorConfig): boolean {
    const isUpdated = super.updateDOM(prevNode, dom, config);
    if (isUpdated) {
      return true;
    }
    // Update styles if needed
    dom.style.opacity = "0.5";
    dom.style.color = "hsl(var(--muted-foreground))";
    dom.style.fontStyle = "italic";
    return false;
  }

  static importJSON(serializedNode: SerializedTextNode): AutocompleteNode {
    const { text } = serializedNode;
    return $createAutocompleteNode(text, "");
  }

  exportJSON(): SerializedTextNode {
    return {
      ...super.exportJSON(),
      type: "autocomplete",
    };
  }

  canInsertTextBefore(): boolean {
    return false;
  }

  isTextEntity(): boolean {
    return true;
  }
}

export function $createAutocompleteNode(
  text: string,
  uuid: string
): AutocompleteNode {
  return $applyNodeReplacement(new AutocompleteNode(text, uuid));
}

export function $isAutocompleteNode(
  node: LexicalNode | null | undefined
): node is AutocompleteNode {
  return node instanceof AutocompleteNode;
}
