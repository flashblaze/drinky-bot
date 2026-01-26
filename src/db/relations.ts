import { defineRelations } from "drizzle-orm";
import * as schema from "./schema";

export const relations = defineRelations(schema, (r) => ({
  userTable: {
    waterLogs: r.many.waterLogTable(),
  },
  waterLogTable: {
    userTable: r.one.userTable({
      from: r.waterLogTable.userId,
      to: r.userTable.id,
    }),
  },
}));
