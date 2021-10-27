BEGIN
	INSERT INTO USERS(id,nickname,email,pic_path) VALUES (p_id,p_name,p_email,p_pic_path);
    SELECT now() as create_time;
END