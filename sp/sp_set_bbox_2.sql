BEGIN
	UPDATE CUTS 
		SET bboxes = p_bboxes,
			progress = GREATEST(progress, (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = 'bbox'))
        WHERE request_id = p_request_id  AND cut_idx = p_cut_idx;
END