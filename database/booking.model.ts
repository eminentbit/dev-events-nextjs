import mongoose, { Document, Model, Schema, Types } from "mongoose";
import { Event } from "./event.model";

// Strongly-typed Booking interface
export interface IBooking {
  eventId: Types.ObjectId;
  email: string;
  createdAt?: Date;
  updatedAt?: Date;
}

export type BookingDocument = IBooking & Document;
export type BookingModel = Model<BookingDocument>;

// Basic email regex for validation (covers common cases)
const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const BookingSchema = new Schema<BookingDocument, BookingModel>(
  {
    eventId: {
      type: Schema.Types.ObjectId,
      ref: "Event",
      required: [true, "eventId is required"],
    },
    email: {
      type: String,
      required: [true, "Email is required"],
      match: [emailRegex, "Invalid email address"],
    },
  },
  { timestamps: true, strict: true }
);

// Index eventId for faster lookups
BookingSchema.index({ eventId: 1 });

// Pre-save hook: ensure referenced Event exists
BookingSchema.pre<BookingDocument>("save", async function () {
  const doc = this;
  // Ensure eventId is a valid ObjectId
  if (!Types.ObjectId.isValid(String(doc.eventId))) {
    throw new Error("Invalid eventId");
  }

  // Verify the event exists; use the Event model's `exists` for efficiency
  const exists = await Event.exists({ _id: doc.eventId });
  if (!exists) {
    throw new Error("Referenced event does not exist");
  }
});

// Export model (reuse existing in dev to avoid OverwriteModelError)
export const Booking =
  (mongoose.models.Booking as BookingModel) ||
  mongoose.model<BookingDocument>("Booking", BookingSchema);

export default Booking;
