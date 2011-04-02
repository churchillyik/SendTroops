// Class LoginAction
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
	start:	function() {
		postMessage("登录:"+ this.username);
		this.sendRequest("login.php", null, this.loginAction1);
	}
	,
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
		if (doc.indexOf("密码错误") >= 0) 
		{
			postError("密码错误");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("用户名不存在") >= 0) 
		{
			postError("用户名不存在");
			this.end(ERROR);
			return;
		}
		if (doc.indexOf("下次自动登入") >= 0) 
		{
			//登录失败
			postError("登录失败");
			this.end(ERROR);
			return;
		}
		
		postMessage("登录成功");
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******