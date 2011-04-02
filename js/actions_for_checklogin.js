//Class CheckLoginAction
function CheckLoginAction(villageId, username, password) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.username = username;
	this.password = password;
}

CheckLoginAction.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		postDebug("CheckLoginAction: "+ this.username, this);
		this.sendRequest("dorf3.php", null, this.action1);
	},
	action1:	function(doc) 
	{
		if (doc.indexOf("下次自动登入") >= 0) 
		{
			//Goto LoginAction
			var action = new LoginAction(null, this.username, this.password);
			action.run(this, this.loginResult);
			return;
		}
		if (doc.indexOf("dorf1.php?ok") >= 0) 
		{
			postError("服务器贴出公告，请先阅读确认，再来重新开始机器人");
			this.end(ERROR);
			return;
		}

		if (doc.indexOf('<a href="dorf3.php">概况</a>') >= 0) 
		{
			postMessage("Check Login 正常");
			this.end(SUCCESS);
			return;
		} 
		else 
		{
			postError("Check Login 未知错误");
			this.end(ERROR);
			return;
		}
	},
	loginResult:	function(action) 
	{
		this.end(action.status);//SUCCESS or ERROR
	}
});
//****** end of Class ******