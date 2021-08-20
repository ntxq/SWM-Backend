BEGIN
	#progress의 역행만 가능하다. progress 순행은 sp_update_cut으로 할 것
	SET @progress = (SELECT PROGRESS_ENUM.index FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.name = p_status);
	UPDATE CUTS 
		SET progress = @progress
        WHERE request_id = p_request_id AND cut_idx = p_cut_idx AND cut_idx = p_cut_idx AND progress > @progress;
	SELECT ROW_COUNT() AS 'ROW_COUNT';
END