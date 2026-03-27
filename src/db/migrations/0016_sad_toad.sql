ALTER TABLE "receipt_details" ADD CONSTRAINT "receipt_details_one_contributor_check" CHECK ((
				(CASE WHEN "receipt_details"."contributor_member_id" IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN "receipt_details"."contributor_group_id" IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN "receipt_details"."contributor_district_id" IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN "receipt_details"."contributor_service_id" IS NOT NULL THEN 1 ELSE 0 END) +
				(CASE WHEN "receipt_details"."contributor_congregation_id" IS NOT NULL THEN 1 ELSE 0 END)
			) = 1);