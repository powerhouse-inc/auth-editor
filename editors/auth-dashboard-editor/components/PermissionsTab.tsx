import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useDrives } from "@powerhousedao/reactor-browser";
import {
  PermissionPanel,
  type AvailableGroup,
  type DocumentAccess,
  type OperationPermissions,
} from "./PermissionPanel.js";

type PermissionLevel = "READ" | "WRITE" | "ADMIN";

// Fallback operation list for `powerhouse/document-drive` in case the
// reactor's `documentModels` query is unavailable. The canonical names are
// in AUTH_LLM_INDEX §6.
const DRIVE_OPERATION_TYPES_FALLBACK = [
  "ADD_FILE",
  "ADD_FOLDER",
  "DELETE_NODE",
  "UPDATE_FILE",
  "UPDATE_NODE",
  "COPY_NODE",
  "MOVE_NODE",
] as const;

/* ── Data shapes ────────────────────────────────────────────── */

interface DriveNode {
  id: string;
  name: string;
  kind: "drive";
  /** True when this drive isn't in Connect's local store — fetched
   *  via `findDocuments` + `document(identifier)` against the switchboard.
   *  Folder hierarchy is still shown (from the drive document's state),
   *  but the user has to add it as a remote drive in Connect before they
   *  can operate on its documents locally. */
  remote: boolean;
  children: TreeNode[];
}

interface FolderNode {
  id: string;
  name: string;
  kind: "folder";
  parentFolder: string | null;
  children: TreeNode[];
}

interface FileNode {
  id: string;
  name: string;
  kind: "file";
  documentType: string;
  parentFolder: string | null;
}

type TreeNode = DriveNode | FolderNode | FileNode;

interface Props {
  query: <T>(gql: string, variables?: Record<string, unknown>) => Promise<T>;
}

/* ── Constants ──────────────────────────────────────────────── */

// No type filtering — admins should see all documents to manage permissions

/* ── Queries / Mutations ────────────────────────────────────── */
// v6: drive tree comes from a mix of `useDrives()` (Connect's reactor-browser
// store — gives us folder nesting for locally synced drives) and
// `findDocuments(...)` against the reactor subgraph (fills in remote drives
// the local store hasn't synced + their flat child docs).

const ALL_DRIVES_QUERY = `{
  findDocuments(
    search: { type: "powerhouse/document-drive" }
    paging: { limit: 500 }
  ) {
    items { id name }
    totalCount
  }
}`;

// Fetch a drive document's full state so we get the same {files,folders}
// shape as locally-synced drives — gives us the folder hierarchy, not just
// direct children.
const DRIVE_DOCUMENT_QUERY = `query DriveDocument($identifier: String!) {
  document(identifier: $identifier) {
    document {
      id
      name
      state
    }
  }
}`;

// All document models the reactor knows about, with their operation lists.
// We use this to discover which operation types each document supports,
// so per-operation permission management works for every document type
// (not just drives). Operation names are whatever the model author defined
// — sometimes SCREAMING_SNAKE_CASE (ADD_FILE), sometimes camelCase
// (addAccount). The `operationType` argument to `grantOperationPermission`
// expects the exact string the model uses.
const DOC_MODELS_QUERY = `{
  documentModels(paging: { limit: 200 }) {
    items {
      id
      specification
    }
  }
}`;

const GROUPS_QUERY = `{ groups { id name } }`;

const DOC_ACCESS_QUERY = `query DocAccess($documentId: String!) {
  documentAccess(documentId: $documentId) {
    documentId
    permissions { documentId userAddress permission grantedBy }
    groupPermissions { documentId groupId group { id name } permission grantedBy }
  }
}`;

// v6: document-level protection + owner (implicit ADMIN)
const DOC_PROTECTION_QUERY = `query DocProtection($documentId: String!) {
  documentProtection(documentId: $documentId) {
    documentId protected ownerAddress
  }
}`;

const SET_PROTECTION = `mutation SetProtection($documentId: String!, $protected: Boolean!) {
  setDocumentProtection(documentId: $documentId, protected: $protected) {
    documentId protected ownerAddress
  }
}`;

const TRANSFER_OWNERSHIP = `mutation TransferOwnership($documentId: String!, $newOwnerAddress: String!) {
  transferDocumentOwnership(documentId: $documentId, newOwnerAddress: $newOwnerAddress) {
    documentId protected ownerAddress
  }
}`;

const GRANT_PERMISSION = `mutation Grant($documentId: String!, $userAddress: String!, $permission: DocumentPermissionLevel!) {
  grantDocumentPermission(documentId: $documentId, userAddress: $userAddress, permission: $permission) {
    documentId userAddress permission
  }
}`;

const REVOKE_PERMISSION = `mutation Revoke($documentId: String!, $userAddress: String!) {
  revokeDocumentPermission(documentId: $documentId, userAddress: $userAddress)
}`;

const GRANT_GROUP_PERMISSION = `mutation GrantGroup($documentId: String!, $groupId: Int!, $permission: DocumentPermissionLevel!) {
  grantGroupPermission(documentId: $documentId, groupId: $groupId, permission: $permission) {
    documentId groupId permission
  }
}`;

const REVOKE_GROUP_PERMISSION = `mutation RevokeGroup($documentId: String!, $groupId: Int!) {
  revokeGroupPermission(documentId: $documentId, groupId: $groupId)
}`;

const OP_PERMS_QUERY = `query OpPerms($documentId: String!, $operationType: String!) {
  operationPermissions(documentId: $documentId, operationType: $operationType) {
    operationType
    userPermissions { userAddress grantedBy }
    groupPermissions { groupId group { id name } grantedBy }
  }
}`;

const GRANT_OP_PERM = `mutation GrantOp($documentId: String!, $operationType: String!, $userAddress: String!) {
  grantOperationPermission(documentId: $documentId, operationType: $operationType, userAddress: $userAddress) {
    documentId operationType userAddress
  }
}`;

const REVOKE_OP_PERM = `mutation RevokeOp($documentId: String!, $operationType: String!, $userAddress: String!) {
  revokeOperationPermission(documentId: $documentId, operationType: $operationType, userAddress: $userAddress)
}`;

const GRANT_GROUP_OP_PERM = `mutation GrantGroupOp($documentId: String!, $operationType: String!, $groupId: Int!) {
  grantGroupOperationPermission(documentId: $documentId, operationType: $operationType, groupId: $groupId) {
    documentId operationType groupId
  }
}`;

const REVOKE_GROUP_OP_PERM = `mutation RevokeGroupOp($documentId: String!, $operationType: String!, $groupId: Int!) {
  revokeGroupOperationPermission(documentId: $documentId, operationType: $operationType, groupId: $groupId)
}`;

/* ── Icons ──────────────────────────────────────────────────── */

const ICONS: Record<string, string> = {
  drive: "\uD83D\uDDB4", // 🖴 hard drive
  folder: "\uD83D\uDCC1", // 📁
  file: "\uD83D\uDCC4", // 📄
};

/* ── Helpers ────────────────────────────────────────────────── */

// Shape of a single node inside a v6 DocumentDriveDocument.state.global.nodes.
// We intentionally keep this loose — the exact union type from
// document-model-libs is awkward to import and only `id`/`name`/`kind`/
// `documentType`/`parentFolder` matter for tree building.
interface RawNode {
  id?: string;
  name?: string;
  kind?: string;
  documentType?: string;
  parentFolder?: string | null;
}

interface RawDrive {
  id: string;
  name: string;
  remote: boolean;
  nodes: RawNode[];
}

function buildTree(drives: RawDrive[]): DriveNode[] {
  return drives.map((drive) => {
    const folders = new Map<string, FolderNode>();
    const rootChildren: TreeNode[] = [];

    // First pass: create all folder nodes
    for (const n of drive.nodes) {
      if (!n.id || n.kind !== "folder") continue;
      folders.set(n.id, {
        id: n.id,
        name: n.name || "Untitled Folder",
        kind: "folder",
        parentFolder: n.parentFolder ?? null,
        children: [],
      });
    }

    // Second pass: create file nodes and attach to parents
    for (const n of drive.nodes) {
      if (!n.id) continue;

      if (n.kind === "folder") {
        const folder = folders.get(n.id)!;
        const parent = n.parentFolder ? folders.get(n.parentFolder) : null;
        if (parent) {
          parent.children.push(folder);
        } else {
          rootChildren.push(folder);
        }
      } else if (n.documentType) {
        const file: FileNode = {
          id: n.id,
          name: n.name || "Untitled",
          kind: "file",
          documentType: n.documentType,
          parentFolder: n.parentFolder ?? null,
        };
        const parent = n.parentFolder ? folders.get(n.parentFolder) : null;
        if (parent) {
          parent.children.push(file);
        } else {
          rootChildren.push(file);
        }
      }
    }

    return {
      id: drive.id,
      name: drive.name || "Untitled Drive",
      kind: "drive" as const,
      remote: drive.remote,
      children: rootChildren,
    };
  });
}

function TypeLabel({ type }: { type: string }) {
  const short = type.includes("/") ? type.split("/").pop() : type;
  return (
    <span
      style={{
        padding: "1px 6px",
        fontSize: "10px",
        color: "#6b7280",
        backgroundColor: "#f3f4f6",
        borderRadius: "3px",
        fontFamily: "monospace",
      }}
    >
      {short}
    </span>
  );
}

/* ── Tree Row ───────────────────────────────────────────────── */

function TreeRow({
  node,
  depth,
  selectedId,
  onSelect,
  expandedIds,
  onToggleExpand,
}: {
  node: TreeNode;
  depth: number;
  selectedId: string | null;
  onSelect: (id: string) => void;
  expandedIds: Set<string>;
  onToggleExpand: (id: string) => void;
}) {
  const hasChildren = "children" in node && node.children.length > 0;
  const isExpanded = expandedIds.has(node.id);
  const isSelected = selectedId === node.id;
  const icon = ICONS[node.kind] || ICONS.file;
  const isContainer = node.kind === "drive" || node.kind === "folder";

  return (
    <>
      <div
        onClick={() => {
          // Selecting a collapsed container auto-expands it
          if (isContainer && !isExpanded && hasChildren) {
            onToggleExpand(node.id);
          }
          onSelect(node.id);
        }}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            if (isContainer && !isExpanded && hasChildren)
              onToggleExpand(node.id);
            onSelect(node.id);
          }
        }}
        style={{
          width: "100%",
          display: "flex",
          alignItems: "center",
          gap: "6px",
          padding: `8px 12px 8px ${12 + depth * 24}px`,
          border: "none",
          borderLeft: isSelected
            ? "3px solid #4f46e5"
            : "3px solid transparent",
          backgroundColor: isSelected ? "#eef2ff" : "transparent",
          cursor: "pointer",
          textAlign: "left",
          fontSize: "13px",
          transition: "background-color 0.1s",
          boxSizing: "border-box",
        }}
        onMouseEnter={(e) => {
          if (!isSelected) e.currentTarget.style.backgroundColor = "#f9fafb";
        }}
        onMouseLeave={(e) => {
          if (!isSelected)
            e.currentTarget.style.backgroundColor = "transparent";
        }}
      >
        {/* Expand/collapse arrow — separate click target */}
        {isContainer ? (
          <span
            onClick={(e) => {
              e.stopPropagation();
              if (hasChildren) onToggleExpand(node.id);
            }}
            style={{
              width: "20px",
              height: "20px",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "10px",
              color: "#9ca3af",
              transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
              transition: "transform 0.15s",
              flexShrink: 0,
              borderRadius: "3px",
              cursor: hasChildren ? "pointer" : "default",
            }}
          >
            {hasChildren ? "\u25B6" : ""}
          </span>
        ) : (
          <span style={{ width: "20px", flexShrink: 0 }} />
        )}

        <span style={{ fontSize: "14px", flexShrink: 0 }}>{icon}</span>

        <span
          style={{
            flex: 1,
            fontWeight: node.kind === "drive" ? 600 : 400,
            color: "#1a1a2e",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {node.name}
        </span>

        {node.kind === "file" && <TypeLabel type={node.documentType} />}

        {node.kind === "drive" && (
          <>
            <span
              style={{
                padding: "1px 6px",
                fontSize: "10px",
                color: "#7c3aed",
                backgroundColor: "#f5f3ff",
                borderRadius: "3px",
                fontWeight: 500,
              }}
            >
              Drive
            </span>
            {node.remote && (
              <span
                title="This drive lives on the switchboard but isn't synced locally in Connect. Add it as a remote drive if you want to operate on its documents."
                style={{
                  padding: "1px 6px",
                  fontSize: "10px",
                  color: "#0369a1",
                  backgroundColor: "#e0f2fe",
                  borderRadius: "3px",
                  fontWeight: 500,
                }}
              >
                Remote
              </span>
            )}
          </>
        )}

        <span
          style={{
            fontFamily: "monospace",
            fontSize: "10px",
            color: "#c4c4c4",
            flexShrink: 0,
          }}
        >
          {node.id.slice(0, 8)}
        </span>
      </div>

      {/* Render children if expanded */}
      {isContainer && isExpanded && hasChildren && (
        <>
          {node.children.map((child) => (
            <TreeRow
              key={child.id}
              node={child}
              depth={depth + 1}
              selectedId={selectedId}
              onSelect={onSelect}
              expandedIds={expandedIds}
              onToggleExpand={onToggleExpand}
            />
          ))}
        </>
      )}
    </>
  );
}

/* ── Main Component ─────────────────────────────────────────── */

export function PermissionsTab({ query }: Props) {
  // v6: Connect already loads and syncs drives — read them straight from the
  // reactor-browser store instead of re-fetching over GraphQL.
  const drives = useDrives();
  // Drives that the switchboard knows about but Connect hasn't locally synced.
  // We fetch them flat (drive + direct child files) via findDocuments.
  const [remoteDrives, setRemoteDrives] = useState<RawDrive[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(true);

  const [error, setError] = useState("");

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const [access, setAccess] = useState<DocumentAccess | null>(null);
  const [accessLoading, setAccessLoading] = useState(false);
  const [availableGroups, setAvailableGroups] = useState<AvailableGroup[]>([]);
  const [opPerms, setOpPerms] = useState<OperationPermissions[]>([]);
  const [protection, setProtection] = useState<{
    protected: boolean;
    ownerAddress: string | null;
  } | null>(null);
  // documentType -> list of operation names (per the document model spec).
  // Loaded once from `documentModels`. Used to render operation-permission
  // rows for any document, not just drives.
  const [opTypesByDocType, setOpTypesByDocType] = useState<
    Record<string, string[] | undefined>
  >({});

  // Track the selected node's label for the panel header
  const selectedLabel = useRef("");
  // Track the selected node's documentType so loadOpPerms knows which
  // operation list to use.
  const selectedDocumentType = useRef<string | null>(null);

  /* ── Data loading ───────────────────────────────────── */

  // Pull a stable set of local drive ids so the remote-fetch effect doesn't
  // run on every store tick.
  const localDriveIds = useMemo(() => {
    const set = new Set<string>();
    for (const d of drives ?? []) set.add(d.header.id);
    return set;
  }, [drives]);
  const localDriveIdsKey = useMemo(
    () => [...localDriveIds].sort().join("|"),
    [localDriveIds],
  );

  useEffect(() => {
    // Wrap in an object so TS sees mutation across the closure (a plain
    // `let cancelled = false` gets narrowed to literal `false` everywhere).
    const ctrl = { cancelled: false };
    setRemoteLoading(true);

    void (async () => {
      try {
        const driveList = await query<{
          findDocuments: { items: { id: string; name: string }[] };
        }>(ALL_DRIVES_QUERY);

        const remoteOnly = driveList.findDocuments.items.filter(
          (d) => !localDriveIds.has(d.id),
        );

        const fetched: RawDrive[] = await Promise.all(
          remoteOnly.map(async (d) => {
            try {
              // Pull the whole drive document so we get state.global.nodes —
              // which includes folder nodes with parentFolder pointers, not
              // just direct file children.
              const docRes = await query<{
                document: {
                  document: {
                    id: string;
                    name: string;
                    state: {
                      global?: { nodes?: RawNode[] };
                    } | null;
                  } | null;
                } | null;
              }>(DRIVE_DOCUMENT_QUERY, { identifier: d.id });

              const nodes =
                docRes.document?.document?.state?.global?.nodes ?? [];

              return {
                id: d.id,
                name: d.name,
                remote: true,
                nodes,
              };
            } catch {
              return { id: d.id, name: d.name, remote: true, nodes: [] };
            }
          }),
        );

        if (!ctrl.cancelled) setRemoteDrives(fetched);
      } catch (e) {
        if (!ctrl.cancelled) {
          setError(
            e instanceof Error
              ? `Failed to load remote drives: ${e.message}`
              : "Failed to load remote drives",
          );
          setRemoteDrives([]);
        }
      } finally {
        if (!ctrl.cancelled) setRemoteLoading(false);
      }
    })();

    return () => {
      ctrl.cancelled = true;
    };
    // localDriveIds is referenced via closure; the stable string `localDriveIdsKey`
    // is what controls re-runs. Including the Set in deps would change the
    // array between renders (HMR/StrictMode) and trip React's invariant.
  }, [query, localDriveIdsKey]);

  const loading = drives === undefined || remoteLoading;

  const tree = useMemo<DriveNode[]>(() => {
    const local: RawDrive[] = (drives ?? []).map((d) => ({
      id: d.header.id,
      name: d.header.name,
      remote: false,
      // The drive document's global state holds the file/folder tree for
      // locally synced drives.
      nodes: (d.state.global as { nodes?: RawNode[] } | undefined)?.nodes ?? [],
    }));
    return buildTree([...local, ...remoteDrives]);
  }, [drives, remoteDrives]);

  // Auto-expand all drives the first time we get a non-empty tree.
  useEffect(() => {
    if (tree.length === 0) return;
    setExpandedIds((prev) => {
      if (prev.size > 0) return prev;
      return new Set(tree.map((d) => d.id));
    });
  }, [tree]);

  const loadGroups = useCallback(async () => {
    try {
      const data = await query<{ groups: AvailableGroup[] }>(GROUPS_QUERY);
      setAvailableGroups(data.groups);
    } catch {
      // Silently fail
    }
  }, [query]);

  // Build the documentType -> operation names map once. The shape of
  // `specification` is loose (it's a JSON scalar in the API), so we walk it
  // defensively.
  const loadDocModels = useCallback(async () => {
    try {
      const data = await query<{
        documentModels: {
          items: { id: string; specification: unknown }[];
        };
      }>(DOC_MODELS_QUERY);

      const map: Record<string, string[]> = {};
      for (const m of data.documentModels.items) {
        const spec = m.specification as
          | {
              modules?: {
                operations?: { name?: string }[];
              }[];
            }
          | null
          | undefined;
        const ops: string[] = [];
        for (const mod of spec?.modules ?? []) {
          for (const op of mod.operations ?? []) {
            if (op.name) ops.push(op.name);
          }
        }
        if (ops.length > 0) map[m.id] = ops;
      }
      setOpTypesByDocType(map);
    } catch {
      // Silently fail — operation-permission rows just won't render for
      // documents whose op list we couldn't load.
    }
  }, [query]);

  const loadProtection = useCallback(
    async (docId: string) => {
      setProtection(null);
      try {
        const data = await query<{
          documentProtection: {
            documentId: string;
            protected: boolean;
            ownerAddress: string | null;
          };
        }>(DOC_PROTECTION_QUERY, { documentId: docId });
        setProtection({
          protected: data.documentProtection.protected,
          ownerAddress: data.documentProtection.ownerAddress,
        });
      } catch {
        // Subgraph may be disabled (no DOCUMENT_PERMISSIONS_ENABLED) — silently skip
      }
    },
    [query],
  );

  const loadAccess = useCallback(
    async (docId: string) => {
      setAccessLoading(true);
      setAccess(null);
      setError("");
      try {
        const data = await query<{ documentAccess: DocumentAccess }>(
          DOC_ACCESS_QUERY,
          { documentId: docId },
        );
        setAccess(data.documentAccess);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Failed to load permissions");
      } finally {
        setAccessLoading(false);
      }
    },
    [query],
  );

  const loadOpPerms = useCallback(
    async (docId: string, documentType: string | null) => {
      setOpPerms([]);
      if (!documentType) return;

      // Pick the operation list from the loaded documentModels map; fall back
      // to the canonical drive ops if the map hasn't loaded yet and the
      // selected node is a drive.
      let opTypes: string[] | undefined = opTypesByDocType[documentType];
      if (
        (opTypes === undefined || opTypes.length === 0) &&
        documentType === "powerhouse/document-drive"
      ) {
        opTypes = [...DRIVE_OPERATION_TYPES_FALLBACK];
      }
      if (opTypes === undefined || opTypes.length === 0) return;

      try {
        const perms = await Promise.all(
          opTypes.map(async (opType) => {
            try {
              const data = await query<{
                operationPermissions: OperationPermissions;
              }>(OP_PERMS_QUERY, {
                documentId: docId,
                operationType: opType,
              });
              return data.operationPermissions;
            } catch {
              return {
                operationType: opType,
                userPermissions: [],
                groupPermissions: [],
              };
            }
          }),
        );

        setOpPerms(perms);
      } catch {
        // Silently fail — operation permissions are optional
      }
    },
    [query, opTypesByDocType],
  );

  /* ── Initial load ───────────────────────────────────── */
  // The drive tree streams in via useDrives(); no polling needed.

  useEffect(() => {
    void loadGroups();
    void loadDocModels();
  }, [loadGroups, loadDocModels]);

  /* ── Selection handlers ─────────────────────────────── */

  function findNodeLabel(id: string): string {
    for (const drive of tree) {
      if (drive.id === id) return drive.name;
      const found = findInChildren(drive.children, id);
      if (found) return found;
    }
    return id.slice(0, 8) + "...";
  }

  function findInChildren(nodes: TreeNode[], id: string): string | null {
    for (const n of nodes) {
      if (n.id === id) return n.name;
      if ("children" in n) {
        const found = findInChildren(n.children, id);
        if (found) return found;
      }
    }
    return null;
  }

  // Resolve the documentType for a selected node. Drives report
  // `powerhouse/document-drive`; files carry their type directly; folders
  // have no operation surface of their own.
  function findDocumentType(id: string): string | null {
    for (const drive of tree) {
      if (drive.id === id) return "powerhouse/document-drive";
      const found = findDocumentTypeInChildren(drive.children, id);
      if (found !== undefined) return found;
    }
    return null;
  }

  function findDocumentTypeInChildren(
    nodes: TreeNode[],
    id: string,
  ): string | null | undefined {
    for (const n of nodes) {
      if (n.id === id) return n.kind === "file" ? n.documentType : null;
      if ("children" in n) {
        const found = findDocumentTypeInChildren(n.children, id);
        if (found !== undefined) return found;
      }
    }
    return undefined;
  }

  const handleSelect = (id: string) => {
    if (selectedId === id) {
      setSelectedId(null);
      setAccess(null);
      setOpPerms([]);
      setProtection(null);
      selectedDocumentType.current = null;
    } else {
      setSelectedId(id);
      selectedLabel.current = findNodeLabel(id);
      const docType = findDocumentType(id);
      selectedDocumentType.current = docType;
      void loadAccess(id);
      void loadOpPerms(id, docType);
      void loadProtection(id);
    }
  };

  const handleToggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  /* ── Mutation handlers ──────────────────────────────── */

  const handleGrantUser = async (address: string, level: PermissionLevel) => {
    if (!selectedId) return;
    try {
      await query(GRANT_PERMISSION, {
        documentId: selectedId,
        userAddress: address,
        permission: level,
      });
      void loadAccess(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to grant permission");
    }
  };

  const handleRevokeUser = async (userAddress: string) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_PERMISSION, { documentId: selectedId, userAddress });
      void loadAccess(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to revoke permission");
    }
  };

  const handleSetProtection = async (next: boolean) => {
    if (!selectedId) return;
    try {
      await query(SET_PROTECTION, {
        documentId: selectedId,
        protected: next,
      });
      void loadProtection(selectedId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to update document protection",
      );
    }
  };

  const handleTransferOwnership = async (newOwnerAddress: string) => {
    if (!selectedId) return;
    try {
      await query(TRANSFER_OWNERSHIP, {
        documentId: selectedId,
        newOwnerAddress,
      });
      void loadProtection(selectedId);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to transfer ownership");
    }
  };

  const handleGrantGroup = async (groupId: number, level: PermissionLevel) => {
    if (!selectedId) return;
    try {
      await query(GRANT_GROUP_PERMISSION, {
        documentId: selectedId,
        groupId,
        permission: level,
      });
      void loadAccess(selectedId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to grant group permission",
      );
    }
  };

  const handleRevokeGroup = async (groupId: number) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_GROUP_PERMISSION, {
        documentId: selectedId,
        groupId,
      });
      void loadAccess(selectedId);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to revoke group permission",
      );
    }
  };

  /* ── Operation permission handlers ─────────────────── */

  const handleGrantOpUser = async (opType: string, address: string) => {
    if (!selectedId) return;
    try {
      await query(GRANT_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        userAddress: address,
      });
      void loadOpPerms(selectedId, selectedDocumentType.current);
    } catch (e) {
      setError(
        e instanceof Error ? e.message : "Failed to grant operation permission",
      );
    }
  };

  const handleRevokeOpUser = async (opType: string, address: string) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        userAddress: address,
      });
      void loadOpPerms(selectedId, selectedDocumentType.current);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to revoke operation permission",
      );
    }
  };

  const handleGrantOpGroup = async (opType: string, groupId: number) => {
    if (!selectedId) return;
    try {
      await query(GRANT_GROUP_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        groupId,
      });
      void loadOpPerms(selectedId, selectedDocumentType.current);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to grant group operation permission",
      );
    }
  };

  const handleRevokeOpGroup = async (opType: string, groupId: number) => {
    if (!selectedId) return;
    try {
      await query(REVOKE_GROUP_OP_PERM, {
        documentId: selectedId,
        operationType: opType,
        groupId,
      });
      void loadOpPerms(selectedId, selectedDocumentType.current);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : "Failed to revoke group operation permission",
      );
    }
  };

  /* ── Render ─────────────────────────────────────────── */

  if (loading) {
    return (
      <p style={{ color: "#6b7280", padding: "24px" }}>Loading documents...</p>
    );
  }

  return (
    <div>
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <div>
          <h3
            style={{ fontSize: "16px", fontWeight: 600, margin: "0 0 4px 0" }}
          >
            Document Permissions
          </h3>
          <p style={{ fontSize: "12px", color: "#9ca3af", margin: 0 }}>
            Select a drive, folder, or document to manage its permissions.
          </p>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            fontSize: "11px",
            color: "#9ca3af",
          }}
        >
          <span
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              backgroundColor: "#22c55e",
              display: "inline-block",
            }}
          />
          Auto-sync
        </div>
      </div>

      {/* Legend */}
      <div
        style={{
          display: "flex",
          gap: "16px",
          padding: "10px 16px",
          backgroundColor: "#f8fafc",
          borderRadius: "6px",
          marginBottom: "16px",
          fontSize: "11px",
          color: "#6b7280",
          flexWrap: "wrap",
        }}
      >
        <span style={{ fontWeight: 600, color: "#374151" }}>
          Permission Levels:
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              backgroundColor: "#3b82f6",
              marginRight: "4px",
            }}
          />
          READ — View only
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              backgroundColor: "#f59e0b",
              marginRight: "4px",
            }}
          />
          WRITE — Can edit
        </span>
        <span>
          <span
            style={{
              display: "inline-block",
              width: "8px",
              height: "8px",
              borderRadius: "2px",
              backgroundColor: "#ef4444",
              marginRight: "4px",
            }}
          />
          ADMIN — Full control
        </span>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {tree.length === 0 ? (
        <p style={{ color: "#9ca3af", fontSize: "14px", padding: "16px 0" }}>
          No drives found.
        </p>
      ) : (
        <div
          style={{
            display: "flex",
            gap: "16px",
            alignItems: "flex-start",
          }}
        >
          {/* Left: Tree */}
          <div
            style={{
              flex: "1 1 0%",
              minWidth: 0,
              border: "1px solid #e5e7eb",
              borderRadius: "8px",
              overflow: "hidden",
            }}
          >
            {tree.map((drive) => (
              <TreeRow
                key={drive.id}
                node={drive}
                depth={0}
                selectedId={selectedId}
                onSelect={handleSelect}
                expandedIds={expandedIds}
                onToggleExpand={handleToggleExpand}
              />
            ))}
          </div>

          {/* Right: Permission Panel */}
          <div style={{ flex: "1 1 0%", minWidth: 0 }}>
            {selectedId === null ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#9ca3af",
                  fontSize: "13px",
                  border: "1px dashed #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                Select a drive, folder, or document from the tree to view and
                manage its permissions.
              </div>
            ) : accessLoading ? (
              <div
                style={{
                  padding: "40px 20px",
                  textAlign: "center",
                  color: "#6b7280",
                  fontSize: "13px",
                  border: "1px solid #e5e7eb",
                  borderRadius: "8px",
                }}
              >
                Loading permissions...
              </div>
            ) : access ? (
              <PermissionPanel
                access={access}
                availableGroups={availableGroups}
                nodeLabel={selectedLabel.current}
                onGrantUser={(addr, level) => void handleGrantUser(addr, level)}
                onRevokeUser={(addr) => void handleRevokeUser(addr)}
                onGrantGroup={(gid, level) => void handleGrantGroup(gid, level)}
                onRevokeGroup={(gid) => void handleRevokeGroup(gid)}
                onRefreshGroups={() => void loadGroups()}
                operationPermissions={opPerms}
                onGrantOpUser={(op, addr) => void handleGrantOpUser(op, addr)}
                onRevokeOpUser={(op, addr) => void handleRevokeOpUser(op, addr)}
                onGrantOpGroup={(op, gid) => void handleGrantOpGroup(op, gid)}
                onRevokeOpGroup={(op, gid) => void handleRevokeOpGroup(op, gid)}
                protection={protection}
                onSetProtection={(next) => void handleSetProtection(next)}
                onTransferOwnership={(addr) =>
                  void handleTransferOwnership(addr)
                }
              />
            ) : null}
          </div>
        </div>
      )}
    </div>
  );
}
