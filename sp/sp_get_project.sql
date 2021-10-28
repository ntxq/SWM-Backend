BEGIN
	SELECT 
		P.id AS project_id, 
		R.request_id AS request_id, 
        C.result_path AS cut1_path,
        (SELECT PROGRESS_ENUM.name FROM PROGRESS_ENUM WHERE PROGRESS_ENUM.index = R.progress) AS progress
			FROM PROJECTS AS P
			JOIN REQUESTS AS R ON P.id = R.project_id
			JOIN CUTS AS C ON C.request_id = R.request_id AND C.cut_idx = 1
			WHERE P.user_id = p_user_id
			ORDER BY P.uploaded_time DESC
			LIMIT p_start, 50;
END