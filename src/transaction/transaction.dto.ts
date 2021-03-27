export interface TransactionDto {
  txid: string;
  network: string;
  address?: string;
  balance_change?: number;
  amount_sent?: number;
  amount_received?: number;
  is_green?: boolean;
  owner?: string;
  createdDate?: number;
  amount_withdrawn?: number;
  network_fee?: number;
  blockio_fee?: number;
}
