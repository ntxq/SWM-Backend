BEGIN
	IF EXISTS (
		SELECT T1.* 
			FROM (SELECT PROJECTS.* FROM PROJECTS JOIN REQUESTS
				ON REQUESTS.project_id = PROJECTS.id
				WHERE REQUESTS.request_id = p_request_id) AS T1
			JOIN (SELECT * FROM `Users`.USERS AS USERS WHERE USERS.id = p_user_id) AS T2
			WHERE T1.user_id = T2.id
		)
	THEN
		SELECT 1 AS "valid";
    ELSE
		SELECT 0 AS "valid";
    END IF;
END