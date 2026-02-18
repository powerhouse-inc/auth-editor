import { useCallback, useEffect, useState } from "react";
import { EnsAddress } from "./EnsAddress.js";

interface Group {
  id: number;
  name: string;
  description: string | null;
  members: string[];
  createdAt: string;
}

interface Props {
  query: <T>(gql: string, variables?: Record<string, unknown>) => Promise<T>;
}

const GROUPS_QUERY = `{
  groups {
    id name description members createdAt
  }
}`;

const CREATE_GROUP = `mutation CreateGroup($name: String!, $description: String) {
  createGroup(name: $name, description: $description) {
    id name description members createdAt
  }
}`;

const DELETE_GROUP = `mutation DeleteGroup($id: Int!) {
  deleteGroup(id: $id)
}`;

const ADD_USER = `mutation AddUser($userAddress: String!, $groupId: Int!) {
  addUserToGroup(userAddress: $userAddress, groupId: $groupId)
}`;

const REMOVE_USER = `mutation RemoveUser($userAddress: String!, $groupId: Int!) {
  removeUserFromGroup(userAddress: $userAddress, groupId: $groupId)
}`;

export function GroupsTab({ query }: Props) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [expandedGroup, setExpandedGroup] = useState<number | null>(null);

  // Create group form
  const [showCreate, setShowCreate] = useState(false);
  const [newName, setNewName] = useState("");
  const [newDesc, setNewDesc] = useState("");

  // Add member form
  const [addMemberGroupId, setAddMemberGroupId] = useState<number | null>(null);
  const [newMemberAddress, setNewMemberAddress] = useState("");

  const loadGroups = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await query<{ groups: Group[] }>(GROUPS_QUERY);
      setGroups(data.groups);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load groups");
    } finally {
      setLoading(false);
    }
  }, [query]);

  useEffect(() => {
    void loadGroups();
  }, [loadGroups]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;
    try {
      await query(CREATE_GROUP, {
        name: newName.trim(),
        description: newDesc.trim() || null,
      });
      setNewName("");
      setNewDesc("");
      setShowCreate(false);
      await loadGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to create group");
    }
  };

  const handleDeleteGroup = async (id: number) => {
    try {
      await query(DELETE_GROUP, { id });
      await loadGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to delete group");
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberAddress.trim() || addMemberGroupId === null) return;
    try {
      await query(ADD_USER, {
        userAddress: newMemberAddress.trim(),
        groupId: addMemberGroupId,
      });
      setNewMemberAddress("");
      setAddMemberGroupId(null);
      await loadGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to add member");
    }
  };

  const handleRemoveMember = async (groupId: number, address: string) => {
    try {
      await query(REMOVE_USER, { userAddress: address, groupId });
      await loadGroups();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to remove member");
    }
  };

  if (loading) {
    return (
      <p style={{ color: "#6b7280", padding: "24px" }}>Loading groups...</p>
    );
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "16px",
        }}
      >
        <h3 style={{ fontSize: "16px", fontWeight: 600, margin: 0 }}>
          Groups ({groups.length})
        </h3>
        <button
          onClick={() => setShowCreate(!showCreate)}
          style={{
            padding: "6px 12px",
            fontSize: "13px",
            fontWeight: 500,
            color: "#fff",
            backgroundColor: "#4f46e5",
            border: "none",
            borderRadius: "6px",
            cursor: "pointer",
          }}
        >
          {showCreate ? "Cancel" : "+ New Group"}
        </button>
      </div>

      {error && (
        <p style={{ color: "#ef4444", fontSize: "13px", marginBottom: "12px" }}>
          {error}
        </p>
      )}

      {showCreate && (
        <form
          onSubmit={(e) => void handleCreateGroup(e)}
          style={{
            padding: "16px",
            border: "1px solid #e5e7eb",
            borderRadius: "8px",
            marginBottom: "16px",
            backgroundColor: "#f9fafb",
          }}
        >
          <input
            type="text"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Group name"
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "13px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              marginBottom: "8px",
              boxSizing: "border-box",
            }}
          />
          <input
            type="text"
            value={newDesc}
            onChange={(e) => setNewDesc(e.target.value)}
            placeholder="Description (optional)"
            style={{
              width: "100%",
              padding: "8px 12px",
              fontSize: "13px",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              marginBottom: "8px",
              boxSizing: "border-box",
            }}
          />
          <button
            type="submit"
            style={{
              padding: "6px 16px",
              fontSize: "13px",
              fontWeight: 500,
              color: "#fff",
              backgroundColor: "#4f46e5",
              border: "none",
              borderRadius: "6px",
              cursor: "pointer",
            }}
          >
            Create
          </button>
        </form>
      )}

      {groups.length === 0 ? (
        <p
          style={{
            color: "#9ca3af",
            fontSize: "14px",
            textAlign: "center",
            padding: "32px",
          }}
        >
          No groups yet. Create one to get started.
        </p>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          {groups.map((group) => (
            <div
              key={group.id}
              style={{
                border: "1px solid #e5e7eb",
                borderRadius: "8px",
                overflow: "hidden",
              }}
            >
              <div
                onClick={() =>
                  setExpandedGroup(expandedGroup === group.id ? null : group.id)
                }
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                  backgroundColor:
                    expandedGroup === group.id ? "#f3f4f6" : "#fff",
                }}
              >
                <div>
                  <span style={{ fontWeight: 600, fontSize: "14px" }}>
                    {group.name}
                  </span>
                  {group.description && (
                    <span
                      style={{
                        color: "#6b7280",
                        fontSize: "13px",
                        marginLeft: "8px",
                      }}
                    >
                      — {group.description}
                    </span>
                  )}
                  <span
                    style={{
                      color: "#9ca3af",
                      fontSize: "12px",
                      marginLeft: "12px",
                    }}
                  >
                    {group.members.length} member
                    {group.members.length !== 1 ? "s" : ""}
                  </span>
                </div>
                <span style={{ color: "#9ca3af", fontSize: "12px" }}>
                  {expandedGroup === group.id ? "▲" : "▼"}
                </span>
              </div>

              {expandedGroup === group.id && (
                <div
                  style={{
                    padding: "12px 16px",
                    borderTop: "1px solid #e5e7eb",
                    backgroundColor: "#fafafa",
                  }}
                >
                  {group.members.length > 0 ? (
                    <ul
                      style={{
                        listStyle: "none",
                        margin: "0 0 12px 0",
                        padding: 0,
                      }}
                    >
                      {group.members.map((addr) => (
                        <li
                          key={addr}
                          style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            padding: "6px 0",
                            fontSize: "13px",
                            fontFamily: "monospace",
                            borderBottom: "1px solid #f3f4f6",
                          }}
                        >
                          <span>
                            <EnsAddress address={addr} />
                          </span>
                          <button
                            onClick={() =>
                              void handleRemoveMember(group.id, addr)
                            }
                            style={{
                              padding: "2px 8px",
                              fontSize: "11px",
                              color: "#ef4444",
                              backgroundColor: "transparent",
                              border: "1px solid #fca5a5",
                              borderRadius: "4px",
                              cursor: "pointer",
                            }}
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p
                      style={{
                        color: "#9ca3af",
                        fontSize: "13px",
                        marginBottom: "12px",
                      }}
                    >
                      No members
                    </p>
                  )}

                  {addMemberGroupId === group.id ? (
                    <form
                      onSubmit={(e) => void handleAddMember(e)}
                      style={{ display: "flex", gap: "8px" }}
                    >
                      <input
                        type="text"
                        value={newMemberAddress}
                        onChange={(e) => setNewMemberAddress(e.target.value)}
                        placeholder="0x... address"
                        style={{
                          flex: 1,
                          padding: "6px 10px",
                          fontSize: "13px",
                          fontFamily: "monospace",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                        }}
                      />
                      <button
                        type="submit"
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#fff",
                          backgroundColor: "#4f46e5",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Add
                      </button>
                      <button
                        type="button"
                        onClick={() => setAddMemberGroupId(null)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          color: "#6b7280",
                          backgroundColor: "#fff",
                          border: "1px solid #d1d5db",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Cancel
                      </button>
                    </form>
                  ) : (
                    <div style={{ display: "flex", gap: "8px" }}>
                      <button
                        onClick={() => setAddMemberGroupId(group.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#4f46e5",
                          backgroundColor: "#fff",
                          border: "1px solid #c7d2fe",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        + Add Member
                      </button>
                      <button
                        onClick={() => void handleDeleteGroup(group.id)}
                        style={{
                          padding: "6px 12px",
                          fontSize: "12px",
                          fontWeight: 500,
                          color: "#ef4444",
                          backgroundColor: "#fff",
                          border: "1px solid #fca5a5",
                          borderRadius: "6px",
                          cursor: "pointer",
                        }}
                      >
                        Delete Group
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
