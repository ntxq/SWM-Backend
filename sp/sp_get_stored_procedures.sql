BEGIN
	SELECT * 
		FROM information_schema.routines 
		WHERE routine_type = 'PROCEDURE' AND (specific_name LIKE 'sp%');
END