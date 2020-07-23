import ts from 'typescript';
import { Chain } from "./Chain"
import { getDeclarationsFromTypeReferenceNode, importSpecifierHandler } from '../../transformer';

export class ChainManager {

  private readonly chainList: Chain[];
  private program: ts.Program

  constructor(program: ts.Program, node?: ts.InterfaceDeclaration | ts.TypeLiteralNode) {
    this.program = program;
    this.chainList = []
    if (node) {
      this.init(node);
    }
  }

  init(node: ts.InterfaceDeclaration | ts.TypeLiteralNode) {
    if (ts.isInterfaceDeclaration(node)) {
      const newChain = new Chain(node);
      this.chainList.push(newChain);
      this.findChains(newChain);
    }
  }

  private findChains(chain: Chain) {
    const node = chain.getTail();
    const nextNodes: Array<ts.InterfaceDeclaration> = [];

    const action = (node: ts.Node) => {
      if (ts.isTypeReferenceNode(node)) {
        if (node.getText() == "Array" && node.typeArguments) {
          const arg = node.typeArguments[0];
          action(arg)
        } else {
          let declaration = getDeclarationsFromTypeReferenceNode(node, this.program)
          declaration = importSpecifierHandler(declaration, this.program);
          if (declaration) {
            action(declaration)
          }
        }
      }
      if (ts.isTypeLiteralNode(node)) {
        trace(node)
      } else if (ts.isInterfaceDeclaration(node)) {
        nextNodes.push(node);
      } else if (ts.isUnionTypeNode(node) || ts.isIntersectionTypeNode(node)) {
        node.types.forEach(type => action(type))
      }
    }

    const trace = (node: ts.InterfaceDeclaration | ts.TypeLiteralNode) => (node.members).forEach((propertySignature) => {
      if (ts.isPropertySignature(propertySignature)) {
        if (propertySignature.type) {
          const typeNode = propertySignature.type
          action(propertySignature.type);
        }
      }
    });

    trace(node)
    if (nextNodes.length > 0) {
      if (nextNodes.length > 1) {
        for (let i = 1; i < nextNodes.length; i++) {
          const newChain = chain.clone().add(nextNodes[i]);
          this.chainList.push(newChain);
          if (!newChain.isIntersectChain()) {
            this.findChains(newChain);
          }
        }
      }
      chain.add(nextNodes[0]);
      if (!chain.isIntersectChain()) {
        this.findChains(chain);
      }
    }
  }

  get chains() {
    return [...this.chainList];
  }

  get intersectChains() {
    return [...this.chainList].filter((chain) => chain.isIntersectChain());
  }

  get intersectNodes(): Array<ts.InterfaceDeclaration> {
    return this.intersectChains.map((loopedChain) => loopedChain.getIntersectNode()).
      filter((value, index, self) => self.indexOf(value) === index) as Array<ts.InterfaceDeclaration>
  }
}
