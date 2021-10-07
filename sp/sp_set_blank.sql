proc_label:BEGIN
DECLARE p_cut_path  VARCHAR(512);
START TRANSACTION;
	UPDATE REQUESTS 
		SET has_blank=true, progress=(SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE name='inpaint') 
        WHERE p_request_id = request_id;
        
    INSERT INTO CUTS(cut_idx,request_id,cut_path,inpaint_path,is_blank) 
		VALUES (0,p_request_id,p_cut_path,p_blank_path,true)
        ON DUPLICATE KEY UPDATE inpaint_path=p_blank_path, is_blank=true;
COMMIT;
END