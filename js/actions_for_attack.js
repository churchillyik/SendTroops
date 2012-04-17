//Class AttackAction
function AttackAction(villageId, target, troops, type, catapult1, catapult2) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	//attack parameters
	this.target = target;
	this.troops = troops;
	this.type   = type;
	this.catapult1 = catapult1;//optional, can be null
	this.catapult2 = catapult2;//optional, can be null
	
	//more parameters for preciseAttack
	this.time     = null;
	this.timeDiff = null;
	
	//results
	this.iAttackDuration = 0;
	this.targetVillage = null;
	//result for preciseAttack
	this.waiting = null;
}

AttackAction.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		postDebug("准备出兵", this);
		this.sendRequest("build.php?id=39&tt=2", null, this.action1);
	},
	
	action1:	function(doc) 
	{
		if (doc.indexOf('<div class="a2b">') < 0) 
		{
			postMessage("未打开 出兵 页面bb");
			this.end(RETRY);
			return;
		}
			
		var param = "";
		var troops = this.troops;
		for (property in troops) 
		{
			//property = "t1"
			//<input type="text" class="text disabled" name="t1" value="" maxlength="6" />				
			var info = startFromStr(doc, 'name="' + property + '"', 200);//t1 方阵
			var iCount = parseDecimal(getStrBetween(info, "\">", "</a>", null));

			var min;
			var max;
			if (troops[property] instanceof Array) 
			{
				min = troops[property][0];
				max = troops[property][1];
			} 
			else if (!isNaN(troops[property])) 
			{
				min = troops[property];
				max = troops[property];
			}
			else 
			{
				postError("部队类型 "+ property + " 输入数量错误:" + troops[property]);
				this.end(ERROR);
				return;
			}
			
			if (iCount < min) 
			{
				postMessage("士兵不够,等待,现有 " + property + " " + iCount + "个");
				this.end(NOT_READY);
				return;
			}
			
			if (iCount > max)
			{
				iCount = max;
			}
			param += property + "=" + iCount + "&";//t1=100&
		}

		info = startFromStr(doc, 'name="timestamp"', 30);//t1 方阵
		var timestamp = getStrBetween(info, 'value="', '" />', null);

		info = startFromStr(doc, 'name="timestamp_checksum"', 20);//t1 方阵
		var timestamp_checksum = getStrBetween(info, 'value="', '" />', null);

		var coord = getCoordinate(this.target);
		param += "b=1&";//hidden param
		param += "timestamp=" + timestamp + "&";//hidden param
		param += "timestamp_checksum=" + timestamp_checksum + "&";//hidden param
		param += "c=" + this.type + "&";			//方式:3普通/侦察 4抢夺
		param += "x=" + coord.x + "&";				//坐标x
		param += "y=" + coord.y + "&";				//坐标y
		param += "dname=";										//村庄名字
		
		postMessage("出兵:　" + this.target);		//(-183|-164)

		this.sendRequest("build.php?id=39&tt=2", param, this.action2);
	},
	
	action2:	function(doc) 
	{
		if (doc.indexOf("在这个坐标没有任何村庄") >= 0) 
		{
			postMessage("在这个坐标没有任何村庄");
			this.end(SUCCESS);
			return;
		}
		
		if (doc.indexOf("帐户因为违规而被冻结") >= 0) 
		{
			postMessage("帐户因为违规而被冻结");
			this.end(SUCCESS);
			return;
		}
		
		if (doc.indexOf("帐户未被激活") >= 0) 
		{
			postMessage("帐户未被激活");
			this.end(SUCCESS);
			return;
		}
		
		if (doc.indexOf("初级玩家保护期") >= 0) 
		{
			//初级玩家保护期到 07/07/26 于 19:49:10</span>
			postMessage("初级玩家保护期" + getStrBetween(doc, "初级玩家保护期", "</span>", null));
			this.end(SUCCESS);
			return;
		}

		var coord = getCoordinate(this.target);
		if (doc.indexOf("<span class=\"coordinateX\">(" + coord.x + "</span>") < 0 || doc.indexOf("<span class=\"coordinateY\">" + coord.y + ")</span>") < 0) 
		{
			//<span class="coordinateX">(188</span>
			//<span class="coordinateY">65)</span>
			postMessage("未打开 出兵确认 页面");
			this.end(RETRY);
			return;
		}

		if (doc.indexOf("占领的村庄") >= 0) 
		{
			postMessage("占领的村庄，跳过");
			this.end(SUCCESS);
			return;
		}
		
		//<div class="in">in 0:40:00 hrs.</div>
		var sAttackDuration = getStrBetween(doc, "<div class=\"in\">", "</div>", null);
		sAttackDuration = getStrBetween(sAttackDuration, " ", " ", null);
		this.iAttackDuration = parseTime(sAttackDuration);

		var form = getStrBetween(doc, '<form method="post" action="build.php?id=39&tt=2">', '</form>', 10000);
		var param = "";

		if (form.indexOf('<select name="kata"') >= 0) 
		{
			//(准备以投石车攻击)
			param += "kata=" + this.catapult1 + "&";
			param += "kata2=" + this.catapult2 + "&";
		}

		for (var i = 0; i < 20; i++) 
		{
			var input = getStrBetween(form, "<input", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			if (type == "hidden" || type == "text") 
			{
				param += name+"="+value+"&";
			}
			if (type == "Radio" && name == "spy") 
			{
				//侦察
				i--;//this is an additional input of the regular attack form
				if (value == "2")//1 侦察敌方现有资源和军队; 2 侦察敌方防守部署和军队
				{
					param += name + "=" + value + "&";
				}
			}
			form = startFromStr(form, input, 2000);
		}

		if (form.indexOf('speed_artefact') >= 0)
		{
			var input = getStrBetween(form, "<input ", ">", 500);
			var type = getStrBetween(input, 'type="', '"', null);
			var name = getStrBetween(input, 'name="', '"', null);
			var value = getStrBetween(input, 'value="', '"', null);
			param += "speed_artefact=" + value + "&"
		}

		//<h1 class="titleInHeader">Reinforcement for 01</h1>
		var info = getStrBetween(doc, "<h1 class=\"titleInHeader\">", "</h1>", 10000);
		if (info.substr(0,3) == "对玩家") 
		{
			this.targetVillage = info.substr(3, info.length - 6);//鼎盛东辑事厂
		} 
		else if (info == "侦察绿洲") 
		{
			this.targetVillage = "绿洲";
		}

		if (this.time == null) 
		{
			// for Attack Action
			postMessage("确认 " + info + " 需时: " + sAttackDuration + " 小时 * 2");
			this.sendRequest("build.php?id=39&tt=2", param, this.action3);
			return;
		} 
		else 
		{				
			// for Precise Attack
			postMessage(info + " 路程需时: " + sAttackDuration + " 小时");
			var iTime  = parseTime(this.time.substr(0, 8)) + parseDecimal(this.time.substr(9, 1)) * 0.1;  //11:32:01.5
			var iStart = iTime - this.iAttackDuration;
			var nowStr = getTimeStr(new Date());
			var iNow   = parseTime(nowStr.substr(0, 8)) + parseDecimal(nowStr.substr(9, 3)) * 0.001;//11:32:01.005
			this.waiting = (iStart - iNow) * 1000;
			while (this.waiting < 0)
			{
				this.waiting += 86400000;//24 hours
			}
			if (this.timeDiff == null || this.waiting > 300000) 
			{
				// > 5 mins
				postMessage("出兵前还需: " + Math.floor(this.waiting/1000) + "秒");
				this.end(NOT_READY);
				return;
			}
			// < 5 mins, 准备精确的倒计时
			this.waiting -=  this.timeDiff;
			var timer = new Timer(this, this.preciseAttack, [param]);
			timer.setTimer(this.waiting);
			postMessage("倒计时: " + this.waiting/1000 + "秒");
			return;
		}
	},
	
	action3:	function(doc) 
	{
		if (doc.indexOf("<div id=\"build\" class=\"gid16\">") < 0) 
		{
			postMessage("未打开 出兵成功 页面");
			this.end(RETRY);
			return;
		}
		this.end(SUCCESS);
		return;
	},
	
	preciseAttack:	function(param) 
	{
		this.sendRequest("build.php?id=39&tt=2", param, this.action3);
		postMessage("压秒: "+ this.time);
	}
});
//****** end of Class ******

// Class AttackTimer
// 出兵任务Timer
function AttackTimer(villageId, target, troops, type, time, catapult1, catapult2) 
{
	// Constructor, put Member Variables here.
	this.Super = BaseWorkflow;
	this.Super();
	
	this.villageId = villageId;
	this.target    = target;
	this.troops    = troops;
	this.type      = type;
	this.time      = time;
	this.catapult1 = catapult1;
	this.catapult2 = catapult2;
}

AttackTimer.Extends(BaseWorkflow, 
{
	// Prototype, put Member Functions here.
	start:	function() 
	{
		var action = new AttackAction(this.villageId, this.target, this.troops, this.type, this.catapult1, this.catapult2);
		action.time = this.time;
		action.run(this, this.attackResult);
	},
	
	attackResult:	function(action) 
	{
		if (action.status == SUCCESS) 
		{
			this.end(SUCCESS);
			return;
		} 
		else if (action.status == NOT_READY) 
		{
			var waiting;
			if (action.waiting) 
			{
				waiting = action.waiting - TimeDiffManager.EVAL_IN_ADVANCE;//提前准备 getTimeDiff()
				if (waiting < 1000)
				{
					waiting = 1000;
				}
				var timer = new Timer(this, this.timeDiffStart, []);
				timer.setTimer(waiting);
				return;
			} 
			else 
			{
				waiting = 600000;//没有士兵等情况 10 mins 重试
				var timer = new Timer(this, this.start, []);
				timer.setTimer(waiting);
				return;
			}
		} 
		else if (action.status == RETRY) 
		{
			var action = new CheckLoginAction(null, g_currentUser.name, g_currentUser.pass);
			action.run(this, this.checkloginResult);
			return;
		} 
		else if (action.status == ERROR) 
		{
			this.end(ERROR);
			return;
		}
	},
	
	timeDiffStart:	function() 
	{
		postDebug("target:" + this.target + " time:" + this.time + " - timeDiffStart", this);
		TimeDiffManager.instance.getTimeDiff(this, this.timeDiffResult);
	},
	
	timeDiffResult:	function(timeDiff) 
	{
		postDebug("target:" + this.target + " time:" + this.time + " - timeDiffResult:" + timeDiff, this);
		//准备精确的倒计时
		var action = new AttackAction(this.villageId, this.target, this.troops, this.type, this.catapult1, this.catapult2);
		action.time = this.time;
		action.timeDiff = timeDiff;
		action.run(this, this.attackResult);
	},
	
	checkloginResult:	function(action) 
	{
		if (action.status == SUCCESS) 
		{
			var timer = new Timer(this, this.start, []);
			timer.setTimer(1000);//1 sec, not neccessary timer
			return;
		} 
		else if (action.status == ERROR) 
		{
			this.end(ERROR);
			return;
		}
	}
});
//****** end of Class ******