import ts, { InterfaceDeclaration } from "typescript";

export class Chain {
  private nodes: Set<ts.InterfaceDeclaration>;
  private isIntersect: boolean;
  private intersectNode?: ts.InterfaceDeclaration | ts.TypeLiteralNode;

  constructor(node: ts.InterfaceDeclaration | Array<ts.InterfaceDeclaration>) {
    this.nodes = new Set();
    Array.isArray(node) ? node.forEach((item) => this.add(item)) : this.add(node);
    this.isIntersect = false;
  }

  add(link: ts.InterfaceDeclaration): this {
    if (!this.isIntersect) {
      if (this.nodes.has(link)) {
        this.intersectNode = link;
        this.isIntersect = true;
      } else {
        this.nodes.add(link);
      }
    }
    return this;
  }

  isIntersectChain(): boolean {
    return this.isIntersect;
  }

  clone(): Chain {
    return new Chain(Array.from(this.nodes));
  }

  getTail(): ts.InterfaceDeclaration | ts.TypeLiteralNode {
    return Array.from(this.nodes).pop() as ts.InterfaceDeclaration | ts.TypeLiteralNode;
  }

  getNodes(): Array<InterfaceDeclaration> {
    return Array.from(this.nodes);
  }

  getIntersectNode(): InterfaceDeclaration | ts.TypeLiteralNode | undefined {
    return this.intersectNode;
  }
  getNodeNames(): string[] {
    return this.getNodes().map((node) => node.name.getText());
  }
}
