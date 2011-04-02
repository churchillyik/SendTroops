//	JScript File

//	Constants
var SUCCESS	= 0;
var ERROR		= 1;
var NOT_READY	= 2;	//	Need to wait for more resources
var RETRY		= 3;		//	未打开


//	Class BaseWorkflow
//	工作流
function BaseWorkflow() 
{
	//Constructor, put Member Variables here.
	this.callerObj  = null;
	this.callbackFunction = null;
	this.status = null;
}

BaseWorkflow.Extends(null, 
{
	//Prototype, put Member Functions here.
	run: function(callerObj, callbackFunction) 
	{
		this.callerObj  = callerObj;
		this.callbackFunction = callbackFunction;
		this.start();
	},
	start: function() 
	{
	},
	end: function(status) 
	{
		this.status = status;
		if (this.callbackFunction)
		{
			this.callbackFunction.apply(this.callerObj, [this]);//arguments
		}
	}
});
//****** end of Class ******


//	Class BaseHttpAction
//	HTTP操作
function BaseHttpAction(villageId) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseWorkflow;
	this.Super();
	
	this.villageId = villageId;
	this.serverURL = "http://" + g_sServerURL + "/";
	this.ajaxReq = new AjaxRequestText();
}

BaseHttpAction.Extends(BaseWorkflow, 
{
	//Prototype, put Member Functions here.
	sendRequest:	function(url, params, nextStep) 
	{
		if (this.villageId) 
		{
			url += (url.indexOf("?") > 0) ? "&" : "?";
			url += "newdid=" + this.villageId;
		}
		this.ajaxReq.send(this.serverURL + url, params, this, nextStep);
		//if (params)
		//	postDebug("params=" + params);
	}
});
//****** end of Class ******