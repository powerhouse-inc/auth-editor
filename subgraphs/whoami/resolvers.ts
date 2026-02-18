import { type ISubgraph } from "@powerhousedao/reactor-api";

interface Context {
  isAdmin?: (address: string) => boolean;
  isUser?: (address: string) => boolean;
  isGuest?: (address: string) => boolean;
  user?: { address: string };
}

export const getResolvers = (subgraph: ISubgraph): Record<string, unknown> => {
  return {
    Query: {
      whoami: (_parent: unknown, args: { address: string }, ctx: Context) => {
        const address = args.address;
        return {
          address,
          isAdmin: ctx.isAdmin?.(address) ?? false,
          isUser: ctx.isUser?.(address) ?? false,
          isGuest: ctx.isGuest?.(address) ?? false,
        };
      },

      documentOperations: async (
        _parent: unknown,
        args: { documentId: string },
      ) => {
        const doc = await subgraph.reactor.getDocument(args.documentId);
        const documentType = doc.header.documentType;

        const allModules = subgraph.reactor.getDocumentModelModules();
        const dm = allModules.find(
          ({ documentModel }) => documentModel.global.id === documentType,
        );

        if (!dm) {
          return {
            documentId: args.documentId,
            documentType,
            operations: [],
          };
        }

        const specs = dm.documentModel.global.specifications;
        const latestSpec = specs[specs.length - 1];
        const operations = latestSpec.modules.flatMap((mod) =>
          mod.operations
            .filter((op) => op.name)
            .map((op) => ({
              name: op.name,
              module: mod.name || "default",
              scope: op.scope || "global",
            })),
        );

        return {
          documentId: args.documentId,
          documentType,
          operations,
        };
      },
    },
  };
};
