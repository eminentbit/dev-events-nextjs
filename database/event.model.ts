import mongoose, { Document, Model, Schema, Types } from "mongoose";

// Strongly-typed Event interface
export interface IEvent {
  title: string;
  slug: string;
  description: string;
  overview: string;
  image: string;
  venue: string;
  location: string;
  date: string; // ISO date string (YYYY-MM-DD)
  time: string; // normalized HH:MM (24h)
  mode: string;
  audience: string;
  agenda: string[];
  organizer: string;
  tags: string[];
  createdAt?: Date;
  updatedAt?: Date;
}

export type EventDocument = IEvent & Document;
export type EventModel = Model<EventDocument>;

// Helper: slugify a string to a URL-friendly value
function slugify(value: string): string {
  return value
    .toString()
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\-\s]/g, "")
    .replace(/\s+/g, "-")
    .replace(/\-+/g, "-");
}

// Validate non-empty strings
const nonEmptyString = {
  validator: (v: string) => typeof v === "string" && v.trim().length > 0,
  message: "Field is required and cannot be empty",
};

const EventSchema = new Schema<EventDocument, EventModel>(
  {
    title: {
      type: String,
      required: [true, "Title is required"],
      validate: nonEmptyString,
    },
    slug: { type: String, required: true, unique: true, index: true },
    description: {
      type: String,
      required: [true, "Description is required"],
      validate: nonEmptyString,
    },
    overview: {
      type: String,
      required: [true, "Overview is required"],
      validate: nonEmptyString,
    },
    image: {
      type: String,
      required: [true, "Image is required"],
      validate: nonEmptyString,
    },
    venue: {
      type: String,
      required: [true, "Venue is required"],
      validate: nonEmptyString,
    },
    location: {
      type: String,
      required: [true, "Location is required"],
      validate: nonEmptyString,
    },
    date: {
      type: String,
      required: [true, "Date is required"],
      validate: nonEmptyString,
    },
    time: {
      type: String,
      required: [true, "Time is required"],
      validate: nonEmptyString,
    },
    mode: {
      type: String,
      required: [true, "Mode is required"],
      validate: nonEmptyString,
    },
    audience: {
      type: String,
      required: [true, "Audience is required"],
      validate: nonEmptyString,
    },
    agenda: {
      type: [String],
      required: [true, "Agenda is required"],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Agenda must be a non-empty array",
      },
    },
    organizer: {
      type: String,
      required: [true, "Organizer is required"],
      validate: nonEmptyString,
    },
    tags: {
      type: [String],
      required: [true, "Tags are required"],
      validate: {
        validator: (v: string[]) => Array.isArray(v) && v.length > 0,
        message: "Tags must be a non-empty array",
      },
    },
  },
  {
    timestamps: true,
    strict: true,
  }
);

// Ensure a unique index on slug at the MongoDB level
EventSchema.index({ slug: 1 }, { unique: true });

// Pre-save hook:
// - Generate a URL-friendly slug from the title when the title changes
// - Normalize `date` to ISO (YYYY-MM-DD) and `time` to HH:MM (24-hour)
EventSchema.pre<EventDocument>("save", async function () {
  // `this` refers to the document being saved
  const doc = this;

  // Slug generation: only when title is modified
  if (doc.isModified("title")) {
    const base = slugify(doc.title || "");
    let candidate = base || `${Date.now()}`;
    // Ensure uniqueness by appending a counter if needed
    let i = 0;
    // Use the model to check for existing slugs (exclude current doc by _id)
    // Loop until a unique slug is found
    // eslint-disable-next-line no-constant-condition
    while (true) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      // `mongoose.models.Event` may or may not be present depending on load order; fall back to model() if needed
      const Model =
        (mongoose.models.Event as EventModel) ||
        mongoose.model<EventDocument>("Event");
      // Count documents with the candidate slug excluding this document
      // If no conflict, break
      // Use `lean` not necessary here; countDocuments is efficient
      // eslint-disable-next-line no-await-in-loop
      const conflict = await Model.countDocuments({
        slug: candidate,
        _id: { $ne: doc._id },
      });
      if (!conflict) break;
      i += 1;
      candidate = `${base}-${i}`;
    }
    doc.slug = candidate;
  }

  // Date normalization: accept JS Date or parsable string, store as YYYY-MM-DD
  if (doc.isModified("date")) {
    const parsed = new Date(doc.date);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error("Invalid date format; expected a valid date");
    }
    // Keep only the date portion in ISO (YYYY-MM-DD)
    doc.date = parsed.toISOString().slice(0, 10);
  }

  // Time normalization: store as HH:MM (24-hour)
  if (doc.isModified("time")) {
    const t = String(doc.time).trim();
    // Accept formats like "9:30 AM", "21:05", "09:05", "9.30" etc.
    // Convert to a Date using today's date for parsing then extract HH:MM
    // Try to parse with Date; fallback to regex extraction
    let hours: number | null = null;
    let minutes: number | null = null;
    const timeRegex = /^(\d{1,2})(?:[:\.](\d{2}))?(?:\s*(AM|PM))?$/i;
    const m = t.match(timeRegex);
    if (m) {
      hours = Number(m[1]);
      minutes = m[2] ? Number(m[2]) : 0;
      const meridiem = m[3];
      if (meridiem) {
        const ampm = meridiem.toUpperCase();
        if (ampm === "PM" && hours < 12) hours += 12;
        if (ampm === "AM" && hours === 12) hours = 0;
      }
    }

    if (
      hours === null ||
      minutes === null ||
      hours < 0 ||
      hours > 23 ||
      minutes < 0 ||
      minutes > 59
    ) {
      throw new Error(
        "Invalid time format; expected HH:MM or a common human time format"
      );
    }
    // Format to HH:MM with leading zeros
    const hh = String(hours).padStart(2, "0");
    const mm = String(minutes).padStart(2, "0");
    doc.time = `${hh}:${mm}`;
  }
});

// Export model (avoid recompilation errors in dev by reusing existing model)
export const Event =
  (mongoose.models.Event as EventModel) ||
  mongoose.model<EventDocument>("Event", EventSchema);

export default Event;
