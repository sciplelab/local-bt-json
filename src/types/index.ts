export interface MessageData {
  type: string;
  channel: string;
  message: string;
  subject?: string;
  channel2?: string;
  dest?: string;
  order_id?: string;
  remarks?: string;
}

export interface ShopifyOrderData {
  id: number;
  order_id?: string;
  message_card?: string;
  delivery_date?: string;
  delivery_time?: string;
  delivery_session?: string;
  delivery_type?: string;
  custom_billing?: string;
  shipping_address1?: string;
  shipping_address2?: string;
  shipping_city?: string;
  shipping_company?: string;
  shipping_name?: string;
  shipping_lastname?: string;
  shipping_country?: string;
  remarks?: string;
}

export interface CommandParameters {
  pr_id?: string;
  log_ids?: string;
  [key: string]: any;
}
