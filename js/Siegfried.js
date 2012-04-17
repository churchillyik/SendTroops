// JScript File

//--------------------------------
// 工具函数
//--------------------------------

//	返回字符串string中从sStart字符开始的，长度为iCount的子字符串
function startFromStr(string, sStart, iCount) 
{
	var iPos = string.indexOf(sStart);
	if (iPos < 0)
	{
		return "";
	}
	return string.substr(iPos + sStart.length, iCount);
}

//	将字符串string从第一个出现sEnd字符的地方截断，返回左半部分的子字符串
function endWithStr(string, sEnd) 
{
	var iPos = string.indexOf(sEnd);
	if (iPos < 0)
	{
		return "";
	}
	return string.substr(0, iPos);
}

//	取得字符串string之中，从第一个出现字符start的地方到第一个出现字符end，最大长度为maxLength的子字符串
function getStrBetween(string, start, end, maxLength) 
{
	if (maxLength == null)
	{
		//	默认返回的字符串长度为100
		maxLength = 100;
	}
	
	var result = startFromStr(string, start, maxLength + end.length);		//	截断左半部分
	result = endWithStr(result, end);																		//	截断右半部分
	return result;
}

//	把字符串解析为数字
function parseDecimal(str) 
{
	var result = parseInt(str, 10);
	if (isNaN(result)) 
	{
		postError("无法解析的数字:" + str);
		return 0;
	} 
	else
	{
		return result;
	}
}

//	把字符串解析为时间(时间字符串格式为"xx:xx:xx")
function parseTime(str) 
{
	var iHour = parseDecimal(endWithStr(str, ":"));
	str = startFromStr(str, ":", 50);
	var iMin  = parseDecimal(endWithStr(str, ":"));
	str = startFromStr(str, ":", 50);
	var iSec  = parseDecimal(str);
	
	var result = ((iHour * 60) + iMin) * 60 + iSec;
	if (isNaN(result)) 
	{
		postError("无法解析的时间:" + str);
		return 0;
	} 
	else 
	{
		return result;
	}
}

//	把日期转化为字符串(时间字符串格式为"xx:xx:xx.xxx")
function getTimeStr(date) 
{
	var timePos = date.toString().indexOf(":") - 2;
	var str = date.toString().substr(timePos, 8);
	var milliSec = date.getTime() % 1000;
	if (milliSec > 0) 
	{
		var milliStr = "00" + milliSec;
		milliStr = milliStr.substr(milliStr.length - 3, 3);
		str += "." + milliStr;
	}
	
	return str;
}

//	获得当前日期的字符串(日期字符串格式为"xxxx-xx-xx xx:xx:xx")
function getNowTimestamp() 
{
	var now 	= new Date();
	var hour 	= "0" + now.getHours();
	var min 	= "0" + now.getMinutes();
	var sec  	= "0" + now.getSeconds();
	
	hour 	= hour.substr(hour.length - 2, 2);
	min 	= min.substr(min.length - 2, 2);
	sec 	= sec.substr(sec.length - 2, 2);
	
	var timestamp = now.getFullYear() 
	+ "-" + (now.getMonth() + 1) 
	+ "-" + now.getDate() 
	+ " " + hour 
	+ ":" + min 
	+ ":" + sec;
	return timestamp;
}

//	把字符串解析为坐标(坐标字符串格式为"xxx|xxx")
function getCoordinate(string) 
{
	var coord = new Object();
	var iPos = string.indexOf("|");
	if (iPos > 0) 
	{
		coord.x = string.substr(0, iPos);
		coord.y = string.substr(iPos + 1, string.length - (iPos + 1));
	}
	
	if (isNaN(coord.x) || isNaN(coord.y))
	{
		postError("无法解析的坐标:" + string);
	}
		
	return coord;
}

//	取得location.href中字符"?"之后，"="之后的部分
function getHtmlParam(sParamName) 
{
	var sParams = startFromStr(location.href, "?", 2000) + "&";
	return getStrBetween(sParams, sParamName + "=", "&", 1000);
}

//	取得类的名称
function getClassName(obj) 
{
	var className = "";
	if (obj && obj.constructor)
	{
		//等效于 getFunctionName(obj.constructor)
		className = getStrBetween(obj.constructor.toString(), "function ", "(", null);
	}
	return className;
}

//	取得函数的名称
function getFunctionName(func) 
{
	var funcName = "";
	if (func && func instanceof Function)
	{
		funcName = getStrBetween(func.toString(), "function ", "(", null);
	}
	return funcName;
}

//	取得资源图片名
function getResourceImg(type) 
{
	var string = "<img border=0 src='http://" 
	+ g_sServerURL 
	+ "/img/un/r/" 
	+ (type + 1) 
	+ ".gif' />";
	return string;
}

//	显示流水消息
var g_sMessage = "";
function postMessage(msg) 
{
	g_sMessage += getNowTimestamp() + ": " + msg + "<br/>\r\n";
	//	g_sMessage超过5000个字符的话，就顶掉最上面的一行
	if (g_sMessage.length > 5000)
	{
		g_sMessage = startFromStr(g_sMessage, "\r\n", 6000);
	}
	document.getElementById('message').innerHTML = g_sMessage;
}

//	清空流水消息
function clearMessage() 
{
	g_sMessage = "";
	document.getElementById('message').innerHTML = g_sMessage;
}

//	打印与某个对象相关的流水消息
function postDebug(msg, callerObj) 
{
	if (!g_isDebug)
		return;
	
	var className = getClassName(callerObj);
	postMessage("[Debug]{" + className + "}" + msg);
}

//	打印错误消息
function postError(msg) 
{
	postMessage("[Error] "+msg);
}


//////////////////////////////////////////////////////////////////
//
// Class Extension Implemention
//
// @author Rick Sun
//
// Usage:
//	function ClassB() 
//	{
//		this.Super = ClassA;
//		this.Super(); //Call Super Constructor first
//		//Constructor, put Member Variables here.
//	}
//	Class.Extends(ClassB, ClassA,
//	{
//		//Prototype, put Member Functions here.
//		member1:function(){……},
//		member1:function(){……}
//	});
//
//////////////////////////////////////////////////////////////////
var Class = 
{
	Extends: function(subClass, superClass, protoType) 
	{
		if (superClass) 
		{
			Class.ExtendProto(subClass.prototype, superClass.prototype);
		}
		Class.ExtendProto(subClass.prototype, protoType);
	},
	
	ExtendProto: function(destination, source) 
	{
		for (property in source) 
		{
			destination[property] = source[property];
		}
	}
}

Function.prototype.Extends = function(superClass, protoType) 
{
	Class.Extends(this, superClass, protoType);
}
///////////////////////////// END of Class Extension /////////////////////////////


// Timer Class
// 定时器
function Timer(obj, func, args) 
{
	if (args == null)
		args = [];
	function execute() 
	{
		func.apply(obj, args);
	}

	var timeout;
	this.setTimer = function(millisec) 
	{
		clearTimeout(timeout);
		timeout = setTimeout(execute, millisec);
		postDebug("setTimeout " + getClassName(obj) + "." + getFunctionName(func) + " in " + millisec + "ms", this);
	}
	this.clearTimer = function() 
	{
		clearTimeout(timeout);
		postDebug("clearTimeout " + getClassName(obj) + "." + getFunctionName(func) + " in " + millisec + "ms", this);
	}
}


// PUBLIC class AjaxRequestText
// Ajax请求
function AjaxRequestText()
{
	// PRIVATE:
	var callerObj    = null;	//	回调函数的参数
	var callbackFunc = null;	//	回调函数
	var request = null;				//	Ajax请求

	// PRIVATE: Get XML HTTP Request object
	// 创建HTTP通讯对象
	function getRequest()
	{
		var req = null;     
		// Mozilla and Internet Explorer 7
		if (window.XMLHttpRequest) 
		{
			req = new XMLHttpRequest();
		}
		// Microsoft IE before 7
		else if (window.ActiveXObject) 
		{
			try { req = new ActiveXObject("Msxml2.XMLHTTP"); }
			catch(e) 
			{
				try { req = new ActiveXObject("Microsoft.XMLHTTP"); }
				catch(e) { req = null; }
			}
		}
		return req;
	}

	// PRIVATE:	回调函数
	function callbackHandler()
	{
		if (request && request.readyState == 4 && callbackFunc) 
		{
			var text = request.responseText;
			callbackFunc.apply(callerObj, [text]);
		}
	}

	// PUBLIC:
	// HTTP POST操作（异步）
	this.send = function(url, params, callerObject, callbackFunction)
	{
		callerObj    = callerObject;
		callbackFunc = callbackFunction;
		// Have to create new request for IE. 
		// Mozilla could reuse the same request. 
		request = getRequest();
		if (request) 
		{
			if (window.netscape) 
			{
				//Enable cross-domain request from local
				try 
				{
					netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
				} 
				catch (e) 
				{
					alert("Permission UniversalBrowserRead denied.");
				}
			}
			request.onreadystatechange = callbackHandler;
			request.open("POST", url, true);	//	异步
			request.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			request.send(params);
		}
	}

	var requestSync = null;
	// PUBLIC:
	// HTTP POST操作（同步）
	this.sendSync = function(url, params) 
	{
		if (!requestSync)
			requestSync = getRequest();

		if (requestSync) 
		{
			if (window.netscape) 
			{
				//Enable cross-domain request from local
				try 
				{
					netscape.security.PrivilegeManager.enablePrivilege("UniversalBrowserRead");
				} 
				catch (e) 
				{
					alert("Permission UniversalBrowserRead denied.");
				}
			}
			requestSync.open("POST", url, false);	//	同步
			requestSync.setRequestHeader("Content-Type", "application/x-www-form-urlencoded");
			requestSync.send(params);
			
			if (requestSync && requestSync.readyState == 4) 
			{
				return requestSync.responseText;
			}
		}
	}
}
///////////////////////////// END AjaxRequestText Object /////////////////////////////
