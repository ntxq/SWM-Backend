BEGIN
	INSERT INTO USERS(id,nickname,email) VALUES (p_id,p_name,p_email);
    SELECT now() as create_time;
END