-- Aggiunge il supporto al "carrello": più prodotti nello stesso ordine
-- vengono collegati tra loro tramite un id di gruppo condiviso.
-- Migrazione puramente additiva: non tocca colonne, righe o vincoli
-- esistenti. Le richieste create prima di questa modifica restano
-- valide con order_group_id = null (ordine singolo prodotto, come prima).

alter table product_requests
  add column if not exists order_group_id uuid;

create index if not exists product_requests_order_group_id_idx
  on product_requests (order_group_id);
