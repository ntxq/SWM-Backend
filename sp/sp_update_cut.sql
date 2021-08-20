BEGIN
	INSERT INTO CUTS(request_id,cut_idx,cut_path,mask_path,inpaint_path) 
		VALUES(p_request_id, p_index, p_cut_path, p_mask_path, p_inpaint_path)
		ON DUPLICATE KEY UPDATE 
			cut_path = IF(p_cut_path IS NOT NULL,p_cut_path,cut_path),
            mask_path = IF(p_mask_path IS NOT NULL,p_mask_path,mask_path),
            mask_image_path = IF(p_mask_image_path IS NOT NULL,p_mask_image_path,mask_image_path),
            inpaint_path = IF(p_inpaint_path IS NOT NULL,p_inpaint_path,inpaint_path);
END