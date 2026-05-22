ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_single_target_chk"
  CHECK (num_nonnulls("productId", "variantId", "locationId", "orderId", "workId") = 1);

ALTER TABLE "barcode_labels"
  ADD CONSTRAINT "barcode_labels_code_not_blank_chk"
  CHECK (length(btrim("code")) > 0);
