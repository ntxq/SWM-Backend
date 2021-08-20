BEGIN
	SELECT cut_count FROM REQUESTS WHERE request_id = p_request_id;
END