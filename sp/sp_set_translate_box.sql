BEGIN
	UPDATE CUTS 
		SET translate_boxes = p_translate_boxes,
			progress = GREATEST(progress, (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = 'translate'))
        WHERE request_id = p_request_id  AND cut_idx = p_cut_idx;
END