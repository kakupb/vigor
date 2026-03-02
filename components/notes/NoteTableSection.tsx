// components/notes/NoteTableSection.tsx
import { NoteTable } from "@/types/note";
import { Ionicons } from "@expo/vector-icons";
import * as Crypto from "expo-crypto";
import { useState } from "react";
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";

type Props = {
  tables: NoteTable[];
  onTablesChange: (tables: NoteTable[]) => void;
};

export function NoteTableSection({ tables, onTablesChange }: Props) {
  const [editingTableId, setEditingTableId] = useState<string | null>(null);

  function handleAddTable() {
    const newTable: NoteTable = {
      id: Crypto.randomUUID(),
      headers: ["Spalte 1", "Spalte 2"],
      rows: [
        { cells: [{ value: "" }, { value: "" }] },
        { cells: [{ value: "" }, { value: "" }] },
      ],
    };
    onTablesChange([...tables, newTable]);
    setEditingTableId(newTable.id);
  }

  function handleDeleteTable(tableId: string) {
    Alert.alert("Tabelle löschen?", "", [
      { text: "Abbrechen", style: "cancel" },
      {
        text: "Löschen",
        style: "destructive",
        onPress: () => onTablesChange(tables.filter((t) => t.id !== tableId)),
      },
    ]);
  }

  function updateTable(tableId: string, updated: NoteTable) {
    onTablesChange(tables.map((t) => (t.id === tableId ? updated : t)));
  }

  function updateHeader(table: NoteTable, colIndex: number, value: string) {
    const newHeaders = [...table.headers];
    newHeaders[colIndex] = value;
    updateTable(table.id, { ...table, headers: newHeaders });
  }

  function updateCell(
    table: NoteTable,
    rowIndex: number,
    colIndex: number,
    value: string
  ) {
    const newRows = table.rows.map((row, ri) =>
      ri === rowIndex
        ? {
            cells: row.cells.map((cell, ci) =>
              ci === colIndex ? { value } : cell
            ),
          }
        : row
    );
    updateTable(table.id, { ...table, rows: newRows });
  }

  function addColumn(table: NoteTable) {
    const newHeaders = [...table.headers, `Spalte ${table.headers.length + 1}`];
    const newRows = table.rows.map((row) => ({
      cells: [...row.cells, { value: "" }],
    }));
    updateTable(table.id, { ...table, headers: newHeaders, rows: newRows });
  }

  function addRow(table: NoteTable) {
    const newRow = {
      cells: table.headers.map(() => ({ value: "" })),
    };
    updateTable(table.id, { ...table, rows: [...table.rows, newRow] });
  }

  function deleteRow(table: NoteTable, rowIndex: number) {
    if (table.rows.length <= 1) return;
    const newRows = table.rows.filter((_, i) => i !== rowIndex);
    updateTable(table.id, { ...table, rows: newRows });
  }

  function deleteColumn(table: NoteTable, colIndex: number) {
    if (table.headers.length <= 1) return;
    const newHeaders = table.headers.filter((_, i) => i !== colIndex);
    const newRows = table.rows.map((row) => ({
      cells: row.cells.filter((_, i) => i !== colIndex),
    }));
    updateTable(table.id, { ...table, headers: newHeaders, rows: newRows });
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Ionicons name="grid-outline" size={15} color="#64748b" />
        <Text style={styles.sectionTitle}>Tabellen</Text>
        <Pressable onPress={handleAddTable} style={styles.addButton}>
          <Ionicons name="add" size={16} color="#3b8995" />
          <Text style={styles.addButtonText}>Tabelle</Text>
        </Pressable>
      </View>

      {tables.length === 0 ? (
        <Pressable onPress={handleAddTable} style={styles.emptyTables}>
          <Ionicons name="grid-outline" size={24} color="#cbd5e1" />
          <Text style={styles.emptyTablesText}>Tabelle hinzufügen</Text>
        </Pressable>
      ) : (
        tables.map((table) => {
          const isEditing = editingTableId === table.id;

          return (
            <View key={table.id} style={styles.tableWrapper}>
              {/* Table toolbar */}
              <View style={styles.tableToolbar}>
                <Pressable
                  onPress={() => setEditingTableId(isEditing ? null : table.id)}
                  style={[
                    styles.tableToolbarButton,
                    isEditing && styles.tableToolbarButtonActive,
                  ]}
                >
                  <Ionicons
                    name={isEditing ? "checkmark" : "pencil-outline"}
                    size={14}
                    color={isEditing ? "white" : "#64748b"}
                  />
                  <Text
                    style={[
                      styles.tableToolbarButtonText,
                      isEditing && styles.tableToolbarButtonTextActive,
                    ]}
                  >
                    {isEditing ? "Fertig" : "Bearbeiten"}
                  </Text>
                </Pressable>

                {isEditing && (
                  <>
                    <Pressable
                      onPress={() => addColumn(table)}
                      style={styles.tableToolbarButton}
                    >
                      <Ionicons name="add-outline" size={14} color="#64748b" />
                      <Text style={styles.tableToolbarButtonText}>Spalte</Text>
                    </Pressable>
                    <Pressable
                      onPress={() => addRow(table)}
                      style={styles.tableToolbarButton}
                    >
                      <Ionicons name="add-outline" size={14} color="#64748b" />
                      <Text style={styles.tableToolbarButtonText}>Zeile</Text>
                    </Pressable>
                  </>
                )}

                <Pressable
                  onPress={() => handleDeleteTable(table.id)}
                  style={styles.tableDeleteButton}
                >
                  <Ionicons name="trash-outline" size={14} color="#ef4444" />
                </Pressable>
              </View>

              {/* Table */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false}>
                <View style={styles.table}>
                  {/* Headers */}
                  <View style={styles.tableRow}>
                    {table.headers.map((header, ci) => (
                      <View
                        key={ci}
                        style={[styles.tableCell, styles.headerCell]}
                      >
                        {isEditing ? (
                          <TextInput
                            value={header}
                            onChangeText={(v) => updateHeader(table, ci, v)}
                            style={styles.headerInput}
                            placeholder={`Spalte ${ci + 1}`}
                          />
                        ) : (
                          <Text style={styles.headerText}>{header}</Text>
                        )}
                        {isEditing && table.headers.length > 1 && (
                          <Pressable
                            onPress={() => deleteColumn(table, ci)}
                            style={styles.deleteColButton}
                          >
                            <Ionicons
                              name="close-circle"
                              size={14}
                              color="#ef4444"
                            />
                          </Pressable>
                        )}
                      </View>
                    ))}
                  </View>

                  {/* Rows */}
                  {table.rows.map((row, ri) => (
                    <View key={ri} style={styles.tableRow}>
                      {/* Reorder Buttons in edit mode */}
                      {isEditing && (
                        <View style={styles.rowReorderCol}>
                          <Pressable
                            onPress={() => {
                              if (ri === 0) return;
                              const newRows = [...table.rows];
                              [newRows[ri], newRows[ri - 1]] = [
                                newRows[ri - 1],
                                newRows[ri],
                              ];
                              updateTable(table.id, {
                                ...table,
                                rows: newRows,
                              });
                            }}
                            style={[
                              styles.rowReorderBtn,
                              ri === 0 && styles.rowReorderBtnDisabled,
                            ]}
                          >
                            <Ionicons
                              name="chevron-up"
                              size={12}
                              color={ri === 0 ? "#cbd5e1" : "#64748b"}
                            />
                          </Pressable>
                          <Pressable
                            onPress={() => {
                              if (ri === table.rows.length - 1) return;
                              const newRows = [...table.rows];
                              [newRows[ri], newRows[ri + 1]] = [
                                newRows[ri + 1],
                                newRows[ri],
                              ];
                              updateTable(table.id, {
                                ...table,
                                rows: newRows,
                              });
                            }}
                            style={[
                              styles.rowReorderBtn,
                              ri === table.rows.length - 1 &&
                                styles.rowReorderBtnDisabled,
                            ]}
                          >
                            <Ionicons
                              name="chevron-down"
                              size={12}
                              color={
                                ri === table.rows.length - 1
                                  ? "#cbd5e1"
                                  : "#64748b"
                              }
                            />
                          </Pressable>
                        </View>
                      )}
                      {row.cells.map((cell, ci) => (
                        <View
                          key={ci}
                          style={[
                            styles.tableCell,
                            ri % 2 === 1 && styles.tableCellAlt,
                          ]}
                        >
                          {isEditing ? (
                            <TextInput
                              value={cell.value}
                              onChangeText={(v) => updateCell(table, ri, ci, v)}
                              style={styles.cellInput}
                              placeholder="–"
                            />
                          ) : (
                            <Text style={styles.cellText}>
                              {cell.value || "–"}
                            </Text>
                          )}
                        </View>
                      ))}
                      {isEditing && table.rows.length > 1 && (
                        <Pressable
                          onPress={() => deleteRow(table, ri)}
                          style={styles.deleteRowButton}
                        >
                          <Ionicons
                            name="close-circle"
                            size={16}
                            color="#ef4444"
                          />
                        </Pressable>
                      )}
                    </View>
                  ))}
                </View>
              </ScrollView>
            </View>
          );
        })
      )}
    </View>
  );
}

const CELL_WIDTH = 120;

const styles = StyleSheet.create({
  section: {
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: "#f1f5f9",
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    marginBottom: 12,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 13,
    fontWeight: "600",
    color: "#64748b",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    backgroundColor: "#f0fbfc",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#a5e8ef",
  },
  addButtonText: {
    fontSize: 12,
    color: "#3b8995",
    fontWeight: "600",
  },
  emptyTables: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingVertical: 16,
    paddingHorizontal: 14,
    backgroundColor: "#f8f9fb",
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#eef0f4",
    borderStyle: "dashed",
  },
  emptyTablesText: {
    fontSize: 13,
    color: "#94a3b8",
  },

  // Table
  tableWrapper: {
    marginBottom: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#e2e8f0",
    overflow: "hidden",
  },
  tableToolbar: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "#f8f9fb",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
  },
  tableToolbarButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingVertical: 5,
    paddingHorizontal: 10,
    borderRadius: 8,
    backgroundColor: "#f1f5f9",
  },
  tableToolbarButtonActive: {
    backgroundColor: "#0f172a",
  },
  tableToolbarButtonText: {
    fontSize: 12,
    fontWeight: "600",
    color: "#64748b",
  },
  tableToolbarButtonTextActive: {
    color: "white",
  },
  tableDeleteButton: {
    marginLeft: "auto",
    padding: 6,
    borderRadius: 8,
    backgroundColor: "#fee2e2",
  },
  table: {
    flexDirection: "column",
  },
  tableRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  tableCell: {
    width: CELL_WIDTH,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRightWidth: 1,
    borderRightColor: "#e2e8f0",
    borderBottomWidth: 1,
    borderBottomColor: "#e2e8f0",
    minHeight: 40,
    justifyContent: "center",
  },
  tableCellAlt: {
    backgroundColor: "#f8f9fb",
  },
  headerCell: {
    backgroundColor: "#f1f5f9",
    position: "relative",
  },
  headerText: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    textTransform: "uppercase",
    letterSpacing: 0.3,
  },
  headerInput: {
    fontSize: 12,
    fontWeight: "700",
    color: "#374151",
    padding: 0,
  },
  cellText: {
    fontSize: 14,
    color: "#334155",
  },
  cellInput: {
    fontSize: 14,
    color: "#334155",
    padding: 0,
  },
  deleteColButton: {
    position: "absolute",
    top: 2,
    right: 2,
  },
  deleteRowButton: {
    paddingHorizontal: 8,
  },
  rowReorderCol: {
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 4,
    gap: 2,
  },
  rowReorderBtn: {
    width: 20,
    height: 20,
    borderRadius: 4,
    backgroundColor: "#f1f5f9",
    justifyContent: "center",
    alignItems: "center",
  },
  rowReorderBtnDisabled: {
    opacity: 0.3,
  },
});
