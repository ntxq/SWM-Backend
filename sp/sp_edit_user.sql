BEGIN
	UPDATE USERS SET
		nickname = IF(p_username IS NOT NULL,p_username,nickname),
		email = IF(p_email IS NOT NULL,p_email,email),
        pic_path = IF(p_pic_path IS NOT NULL,p_pic_path,pic_path) 
        WHERE id=p_id;
END