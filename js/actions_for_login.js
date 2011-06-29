// Class LoginAction
// 登录操作	
function LoginAction(villageId, username, password) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.username = username;
	this.password = password;
}

LoginAction.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		postMessage("登录:"+ this.username);
		this.sendRequest("login.php", null, this.loginAction1);
	},
	
	loginAction1:	function(doc) 
	{
		var form = getStrBetween(doc, '<form method="post" name="snd" action="dorf1.php">', '</form>',2000);
		if (form.length == 0) 
		{
			postError("未打开 登录 页面");
			this.end(ERROR);
			return;
		}
		
		var param = "";
		for (var i = 0; i < 7; i++) 
		{
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text" || type == "password") 
			{
				if (type == "text")
				{
					value = this.username;
				}
				if (type == "password")
				{
					value = this.password;
				}
				param += name+"="+value+"&";
			}
			if (type == "Checkbox") 
			{
				param += name+"="+value;
			}
			form = startFromStr(form, input, 2000);
		}
		
		this.sendRequest("dorf1.php", param, this.loginAction2);
	},
	
	loginAction2:	function(doc) 
	{
		var text = getStrBetween(doc, '<span class="error">', ' </span>', 50);
		if (text.length > 0)
		{
			postError(text);
			this.end(ERROR);
			return;
		}
		
		postMessage("登录成功");
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******

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
		if (doc.indexOf('<div id="content" class="login">') >= 0) 
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

		if (doc.indexOf('<div id="content" class="village3">') >= 0) 
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