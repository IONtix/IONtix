/**
 * IONtix Platform Type Contracts
 *
 * Single source of truth untuk type contract yang dipakai
 * oleh Server Actions, API Routes, Dashboard, Checkout,
 * Super Admin, Event Builder, Ticketing, dan Dynamic Forms.
 */

import type { Prisma } from "@/generated/prisma/client";

/* -------------------------------------------------------------------------- */
/* JSON                                                                     */
/* -------------------------------------------------------------------------- */

/**
 * Gunakan tipe JSON resmi Prisma sebagai single source of truth untuk data
 * JSON yang datang dari/masuk ke database. Ini mencegah konflik tipe antara
 * Prisma.JsonValue dan custom JsonValue.
 */
export type JsonValue = Prisma.JsonValue;
export type JsonObject = Prisma.JsonObject;
export type JsonArray = Prisma.JsonArray;

/* -------------------------------------------------------------------------- */
/* COMMON                                                                    */
/* -------------------------------------------------------------------------- */

export type ID = string;

export type DateLike = string | Date;

export type Nullable<T> = T | null;

export type Optional<T> = T | undefined;

/* -------------------------------------------------------------------------- */
/* CUSTOM / DYNAMIC FORM                                                     */
/* -------------------------------------------------------------------------- */

export interface CustomFieldDefinition {
  id?: string;
  key?: string;
  label: string;
  type: string;
  required?: boolean;
  options?: string[];
  placeholder?: string;
  targetCategoryIds?: string[];
}

export interface EventFormCustomFieldData extends Omit<
  CustomFieldDefinition,
  "id"
> {
  id?: string;
  helpText?: string;
}

/**
 * Nilai yang dapat digunakan oleh dynamic form.
 */
export type FormFieldValue = string | number | boolean | null | string[];

/* -------------------------------------------------------------------------- */
/* CHECKOUT                                                                  */
/* -------------------------------------------------------------------------- */

export interface CheckoutEventData {
  id: string;
  title: string;
  date: DateLike;
  location: string | null;
  imageUrl?: string | null;
}

export interface CheckoutTicketData {
  id: string;
  name: string;
  price: number;
  capacity: number;
  requireApproval?: boolean;
}

export interface CheckoutAddonData {
  id: string;
  name: string;
  price: number;
  capacity: number | null;
  type: string;
}

export interface CheckoutPayload {
  eventId: string;
  tickets: CheckoutTicketSelection[];
}

export interface CheckoutTicketSelection {
  ticketCategoryId: string;
  quantity: number;
  participants: CheckoutParticipantData[];
}

export interface CheckoutParticipantData {
  fullName: string;
  email: string;
  phone: string;
  jerseySize?: string | null;
  bloodType?: string | null;
  emergencyContact?: string | null;
  customAnswers?: JsonObject | null;
  addonIds?: string[];
}

export interface CheckoutPaymentSession {
  orderId: string;
  externalId: string;
  checkoutUrl: string | null;
  token: string | null;
  status: string;
  expiresAt?: DateLike | null;
}

export interface CheckoutOrderSuccessResponse {
  success: true;
  message: string;
  orderIds: string[];
  paymentSessions: CheckoutPaymentSession[];
}

export interface CheckoutOrderErrorResponse {
  success: false;
  error: string;
}

export type CheckoutOrderResponse =
  | CheckoutOrderSuccessResponse
  | CheckoutOrderErrorResponse;

/* -------------------------------------------------------------------------- */
/* TICKET / ORDER                                                            */
/* -------------------------------------------------------------------------- */

export interface TicketOrderLookup {
  id: string;
  fullName: string | null;
  jerseySize: string | null;
  ticketCategory: {
    name: string;
    event: {
      title: string;
    };
  };
}

export interface OrderAddonRow {
  id?: string;
  quantity: number;
  addon: {
    id?: string;
    name: string;
  };
}

export interface OrderRow {
  id: string;
  fullName: string | null;
  email: string | null;
  phone: string | null;
  jerseySize?: string | null;
  categoryName: string;
  customAnswers?: JsonValue | null;
  approvalStatus?: string | null;
  requireApproval?: boolean;
  addonOrders?: OrderAddonRow[];
}

/* -------------------------------------------------------------------------- */
/* EO / DASHBOARD                                                            */
/* -------------------------------------------------------------------------- */

export interface DashboardEventOption {
  id: string;
  title: string;
}

export interface DashboardEventCategory {
  id?: string;
  name?: string;
  capacity: number;
  price?: number;
}

export interface DashboardEvent {
  id: string;
  title: string;

  category?: string | null;

  locationName?: string | null;
  location?: string | null;
  venue?: string | null;

  date: string;

  time?: string;

  bannerUrl?: string | null;
  imageUrl?: string | null;
  posterUrl?: string | null;
  image?: string | null;
  poster?: string | null;
  posterPreview?: string | null;

  status?: string;
  isPublished?: boolean;

  quota?: number;
  soldTickets?: number;

  revenue?: string;

  categories?: DashboardEventCategory[];
}

export interface DashboardTransaction {
  id: string;
  name?: string | null;
  category?: string | null;
  amount: number;
  status: string;
  date?: string | null;
  createdAt?: DateLike | null;
  paymentMethod?: string | null;
  runner?: {
    id?: string;
    name?: string | null;
    email?: string | null;
  } | null;
}

/* -------------------------------------------------------------------------- */
/* SUPER ADMIN                                                               */
/* -------------------------------------------------------------------------- */

export interface SuperAdminEvent {
  id: string;
  name?: string | null;
  title?: string | null;

  location?: string | null;

  date?: DateLike | null;
  startDate?: DateLike | null;

  isPublished: boolean;

  createdAt: DateLike;

  eo?: {
    name: string | null;
  } | null;
}

export interface FinanceTransaction {
  id: string;
  amount: number;
  status: string;
  createdAt: DateLike;
  paymentMethod?: string | null;

  runner?: {
    name?: string | null;
    email?: string | null;
  } | null;
}

export interface SuperAdminRole {
  id: string;
  name: string;
  isSystem?: boolean;
}

export interface SuperAdminOrganization {
  id: string;
  name: string;
  slug?: string;
  status?: string;
}

export interface SuperAdminUser {
  id: string;
  name: string | null;
  email: string;
  phone?: string | null;

  role?: SuperAdminRole | null;

  status?: string | null;
  isDeleted?: boolean;
  emailVerifiedAt?: DateLike | null;
  createdAt?: DateLike | null;
  updatedAt?: DateLike | null;

  organizations?: SuperAdminOrganization[];
}

/* -------------------------------------------------------------------------- */
/* EVENT BUILDER                                                             */
/* -------------------------------------------------------------------------- */

export interface EventFormTicketData {
  id: string | number;
  name: string;

  price: string | number;
  quota: string | number;

  elevation?: string;
  cot?: string;

  description?: string;

  requireApproval?: boolean;
}

export interface EventFormAddonData {
  id: string;
  type: string;
  name: string;

  price: string | number;
  quota: string | number;

  description?: string;

  imageUrl?: string | null;

  details?: JsonObject;
}

export interface EventFormInitialData {
  id?: string;

  title?: string;
  name?: string;

  category?: string;

  startDate?: DateLike;
  date?: DateLike;
  endDate?: DateLike | null;

  location?: string;
  locationName?: string;

  mapsUrl?: string;

  description?: string;
  rules?: string;

  contactName?: string;
  contactPhone?: string;

  posterUrl?: string | null;
  logoUrl?: string | null;

  customFields?: EventFormCustomFieldData[];
  addons?: EventFormAddonData[];
  categories?: EventFormTicketData[];
}

/* -------------------------------------------------------------------------- */
/* EVENT PAYLOAD                                                             */
/* -------------------------------------------------------------------------- */

export interface EventPayload {
  id?: string;

  title: string;
  category?: string;

  date: string;
  endDate?: string | null;

  locationName?: string;
  location?: string;

  mapsUrl?: string;

  description?: string;
  rules?: string;

  contactName?: string;
  contactPhone?: string;

  imageUrl?: string | null;
  logoUrl?: string | null;
  posterUrl?: string | null;

  categories?: EventFormTicketData[];

  customFields?: CustomFieldDefinition[];

  addons?: EventFormAddonData[];
}

/* -------------------------------------------------------------------------- */
/* API RESULT                                                                */
/* -------------------------------------------------------------------------- */

export interface SuccessResult<T = undefined> {
  success: true;
  message?: string;
  data?: T;
}

export interface ErrorResult {
  success: false;
  error: string;
  message?: string;
}

export type ApiResult<T = undefined> = SuccessResult<T> | ErrorResult;

/* -------------------------------------------------------------------------- */
/* TYPE GUARDS                                                               */
/* -------------------------------------------------------------------------- */

export function isSuccessResult<T>(
  result: ApiResult<T>,
): result is SuccessResult<T> {
  return result.success === true;
}

export function isErrorResult<T>(result: ApiResult<T>): result is ErrorResult {
  return result.success === false;
}

/* -------------------------------------------------------------------------- */
/* ERROR HELPERS                                                             */
/* -------------------------------------------------------------------------- */

export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") {
    return error;
  }

  return "Terjadi kesalahan yang tidak diketahui.";
}

/* -------------------------------------------------------------------------- */
/* NORMALIZATION                                                             */
/* -------------------------------------------------------------------------- */

export function normalizeString(value: unknown, fallback = ""): string {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" || typeof value === "boolean") {
    return String(value);
  }

  return fallback;
}

export function normalizeNullableString(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeString(value);
}

export function normalizeNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : fallback;
  }

  if (typeof value === "string") {
    const normalized = Number(value);

    return Number.isFinite(normalized) ? normalized : fallback;
  }

  return fallback;
}

/* -------------------------------------------------------------------------- */
/* FORM / JSON SAFETY                                                        */
/* -------------------------------------------------------------------------- */

export function isJsonObject(value: unknown): value is JsonObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function isJsonArray(value: unknown): value is JsonValue[] {
  return Array.isArray(value);
}

export function isCustomFieldDefinition(
  value: unknown,
): value is CustomFieldDefinition {
  if (!isJsonObject(value)) {
    return false;
  }

  return typeof value.label === "string" && typeof value.type === "string";
}

export function parseCustomFieldDefinitions(
  value: unknown,
): CustomFieldDefinition[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.filter(isCustomFieldDefinition);
}
