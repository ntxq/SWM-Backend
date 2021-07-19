CREATE DEFINER=`admin`@`%` PROCEDURE `sp_add_original_source`(
p_user_id INT,
p_name VARCHAR(128)
)
BEGIN
START TRANSACTION;
	INSERT INTO original_source(user_id,original_source.name) 
			VALUES (p_user_id,p_name);
    SELECT LAST_INSERT_ID() as id;
COMMIT;
END