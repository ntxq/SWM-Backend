BEGIN
	SELECT create_time, nickname, email FROM USERS WHERE USERS.id= p_id LIMIT 1;
END