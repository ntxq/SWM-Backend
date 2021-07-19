CREATE DEFINER=`admin`@`%` PROCEDURE `sp_set_balnk_source`(
p_request_id INT,
p_user_id INT,
p_has_blank BOOLEAN
)
proc_label:BEGIN
DECLARE EXIT HANDLER FOR SQLEXCEPTION
BEGIN
	SHOW ERRORS;
	ROLLBACK;
END;
START TRANSACTION;

    IF NOT EXISTS(SELECT request_id FROM original_source WHERE p_request_id = request_id)THEN
		SELECT 'not exist key' AS error_msg;
        LEAVE proc_label;
    END IF;

	UPDATE original_source SET has_blank=p_has_blank WHERE p_request_id = request_id AND p_user_id = user_id;
COMMIT;
END