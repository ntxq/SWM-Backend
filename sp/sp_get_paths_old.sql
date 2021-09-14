BEGIN
	SELECT cut_path,inpaint_path,mask_path,mask_image_path FROM CUTS WHERE request_id = p_request_id AND cut_idx = p_cut_idx;
END