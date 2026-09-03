export type CommentDTO = {
  id: string;
  body: string;
  visibility: "PUBLIC" | "INTERNAL";
  authorId: string;
  authorName: string;
  createdAt: string; // ISO
};
