BEGIN

START TRANSACTION;
	IF p_result_path IS NOT NULL THEN
		SET @progress = (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = 'complete');
	ELSEIF p_inpaint_path IS NOT NULL THEN
		SET @progress = (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = 'inpaint');
	ELSEIF p_mask_image_path IS NOT NULL THEN
		SET @progress = (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = 'mask');
	ELSEIF p_cut_path IS NOT NULL THEN
		SET @progress = (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = 'cut');
	ELSE 
		SET @progress = 0;
	END IF;
    
	INSERT INTO CUTS(request_id,cut_idx,cut_path,mask_path,inpaint_path,progress) 
		VALUES(p_request_id, p_index, p_cut_path, p_mask_path, p_inpaint_path,@progress)
		ON DUPLICATE KEY UPDATE 
			cut_path = IF(p_cut_path IS NOT NULL,p_cut_path,cut_path),
            mask_path = IF(p_mask_path IS NOT NULL,p_mask_path,mask_path),
            mask_image_path = IF(p_mask_image_path IS NOT NULL,p_mask_image_path,mask_image_path),
            inpaint_path = IF(p_inpaint_path IS NOT NULL,p_inpaint_path,inpaint_path),
            result_path = IF(p_result_path IS NOT NULL,p_result_path,result_path),
            is_user_upload = IF(p_is_user_upload IS NOT NULL AND p_inpaint_path IS NOT NULL,p_is_user_upload,is_user_upload),
            progress = GREATEST(@progress,progress);
COMMIT;
END