BEGIN
START TRANSACTION;
	UPDATE BBOXS SET 
		originalX = p_originalX, 
		originalY = p_originalY, 
		originalWidth = p_originalWidth,
		originalHeight = p_originalHeight , 
		originalText = p_originalText
        WHERE request_id = p_request_id AND bbox_id = p_bbox_id;
        
	INSERT INTO TRANSLATE_BOX(request_id,language,box_id,translatedText,translatedX,translatedY,translatedWidth,translatedHeight,fontColor,fontSize,fontFamily,fontWeight,fontStyle)
		VALUES (p_request_id,p_language,p_bbox_id,p_translatedText,p_translatedX,p_translatedY,p_translatedWidth,p_translatedHeight,p_fontColor,p_fontSize,p_fontFamily,p_fontWeight,p_fontStyle)
        ON DUPLICATE KEY UPDATE
			translatedText = p_translatedText,
            translatedX = p_translatedX,
            translatedY = p_translatedY,
            translatedWidth = p_translatedWidth,
			translatedHeight = p_translatedHeight,
            fontColor = p_fontColor,
            fontSize = p_fontSize,
            fontFamily = p_fontFamily,
            fontWeight = p_fontWeight,
            fontStyle = p_fontStyle;
COMMIT;
END