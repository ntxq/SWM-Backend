BEGIN
START TRANSACTION;
	INSERT INTO TOKEN(TOKEN.token) VALUES (p_token);

    SET @token_index = LAST_INSERT_ID();
    SELECT @token_index as token_index;
	UPDATE USERS SET USERS.token_index = @token_index WHERE USERS.id = p_ID;
COMMIT;
END