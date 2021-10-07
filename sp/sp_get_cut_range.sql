BEGIN
	SELECT cut_idx,cut_start,cut_end FROM CUTS WHERE request_id = p_request_id AND cut_idx > 0;
	IF FOUND_ROWS()= 0 THEN
        SIGNAL SQLSTATE 'SP500' SET MESSAGE_TEXT = 'row not exists';
    END IF;
END