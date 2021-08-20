BEGIN
	DECLARE EXIT HANDLER FOR SQLEXCEPTION
    BEGIN
		ROLLBACK;
        RESIGNAL;
    END;
    
    SET @cut_count = (SELECT cut_count FROM REQUESTS WHERE request_id=p_request_id);
    IF @cut_count IS NULL THEN
		SIGNAL SQLSTATE 'SP400' SET MESSAGE_TEXT = 'invalid parameter';
    ELSEIF @cut_count < p_cut_idx THEN
		SIGNAL SQLSTATE 'SP400' SET MESSAGE_TEXT = 'invalid parameter';
    END IF;
    
	SELECT cut_path,inpaint_path,mask_path,mask_image_path FROM CUTS WHERE request_id = p_request_id AND cut_idx = p_cut_idx;
    
	IF FOUND_ROWS()= 0 THEN
        SIGNAL SQLSTATE 'SP500' SET MESSAGE_TEXT = 'row not exists';
    END IF;
END