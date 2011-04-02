//Class EvaluateTimeDiff
function EvaluateTimeDiff(villageId) 
{
	//Constructor, put Member Variables here.
	this.Super = BaseHttpAction;
	this.Super(villageId);
	
	this.TRIAL_TOTAL = 10;
	this.TRIAL_INTERVAL = 100;//milliseconds;
	this.arrayTimeDiff;
	this.arrayRequestTime;
	this.i;
	this.timer = new Timer(this, this.request, null);
	
	this.timeDiff;
}

EvaluateTimeDiff.Extends(BaseHttpAction, 
{
	//Prototype, put Member Functions here.
	start:	function() 
	{
		this.arrayTimeDiff    = new Array(this.TRIAL_TOTAL);
		this.arrayRequestTime = new Array(this.TRIAL_TOTAL);
		
		this.i = 0;
		this.loop();
		return;//Start loop
	},
	loop:		function() 
	{
		if (this.i >= this.TRIAL_TOTAL) 
		{
			this.result();
			return;//End of loop
		}
		
		var waiting = 1000 + this.TRIAL_INTERVAL * this.i;
		var now = new Date();
		waiting -= now.getTime() % 1000;
		if (waiting < 1000)
		{
			waiting += 1000;
		}
		//postMessage( getTimeStr(new Date(now.getTime() + waiting)) );
		this.timer.setTimer(waiting);
	},
	request:	function() 
	{
		this.arrayRequestTime[this.i] = new Date();
		this.sendRequest("a2b.php", null, this.response);
	},
	response:	function(doc) 
	{
		if (doc.indexOf("<h1>出兵</h1>") < 0) 
		{
			postMessage("未打开 出兵 页面");
			this.end(RETRY);
			return;
		}
		var info = getStrBetween(doc, '<span id="tp1" class="b">', "</span>", 200);//<div id="ltime">用时 <b>16</b> ms<br>服务器时间: <span id="tp1" class="b">22:38:55</span> <span class="f6">(CST-15)</span></div>
		var estimateMS = this.arrayRequestTime[this.i].getTime() % 3600000;
		var realMS = parseTime(info) * 1000 % 3600000 + 500;//We suppose that server floors millisecs instead of rounds them
		var diff = realMS - estimateMS;
		if (diff >  1800000)
		{
			diff -= 3600000;
		}
		if (diff < -1800000)
		{
			diff += 3600000;
		}
		postMessage("本地时间 " + getTimeStr(this.arrayRequestTime[this.i]) + " 服务器时间 " + info + " 时差 " + diff + "毫秒");
		if (diff > 60000 || diff < -60000)
		{
			postMessage("时差超过1分钟，离谱");
		}

		this.arrayTimeDiff[this.i] = diff;

		this.i++;
		this.loop();
		return;//Next loop
	}
	,
	result:	function() 
	{
		var array = this.arrayTimeDiff;
		//var sum = 0;
		var earliest = array[0];
		for (var i=0; i<array.length; i++) 
		{
			//sum += array[i];
			if (array[i] < earliest)
				earliest = array[i];
		}
		
		//this.timeDiff = Math.round(sum/array.length);
		this.timeDiff = earliest + 450;
		postMessage(array.length + "次尝试平均时差 " + this.timeDiff + "毫秒");
		//for (var i=0; i<this.arrayRequestTime.length; i++) 
		//{
		//	postMessage( getTimeStr(this.arrayRequestTime[i]) +" - "+ getTimeStr(new Date(this.arrayRequestTime[i].getTime()+this.timeDiff)) +" - "+ getTimeStr(new Date(this.arrayRequestTime[i].getTime()+this.arrayTimeDiff[i])) );
		//}
		this.end(SUCCESS);
		return;
	}
});
//****** end of Class ******


//Class TimeDiffManager
//Singleton
function TimeDiffManager() 
{
	//Constructor, put Member Variables here.
	this.timeDiff = null;
	this.evaluateTime = null;
	
	this.evalStartTime = null;
	
	this.callerStack = new Array();//[]
	this.villageId = null;
}

TimeDiffManager.Extends(null, 
{
	//Prototype, put Member Functions here.
	getTimeDiff:	function(callerObj, callbackFunction) 
	{
		if (!callbackFunction)
			return;
		
		if (this.timeDiff && (new Date().getTime() - this.evaluateTime.getTime()) < 300 * 1000) 
		{
			//last evaluation is within  5 min, which means Not Expired
			callbackFunction.apply(callerObj, [this.timeDiff]);
			return;
		}
		
		//push caller info into Stack
		var caller = new Object();
		caller.callerObj  = callerObj;
		caller.callbackFunction = callbackFunction;
		this.callerStack.push(caller);
		//If current caller is the first one, start evaluation process;
		if (this.callerStack[0] == caller) 
		{
			if (callerObj)
				this.villageId = callerObj.villageId;
			this.evaluateStart();
			return;
		}
	},
	evaluateStart:	function() 
	{
		this.evalStartTime = new Date();
		
		var action = new EvaluateTimeDiff(this.villageId);
		action.run(this, this.evaluateResult);
	},
	evaluateResult:	function(action) 
	{
		if (action.status == RETRY) 
		{
			var action = new CheckLoginAction(null, g_currentUser.name, g_currentUser.pass);
			action.run(this, this.checkloginResult);
			return;
		}
		
		this.timeDiff = action.timeDiff;
		this.evaluateTime = new Date();

		//loop through stack, and callback all callers
		var callbackDueIn = this.evalStartTime.getTime() + TimeDiffManager.EVAL_IN_ADVANCE - this.evaluateTime.getTime() - this.timeDiff;
		var interval;
		if (callbackDueIn > 20 * 1000) 
		{
			//leave 20 secs for final countdown
			interval = Math.floor((callbackDueIn - 20 * 1000) / this.callerStack.length);
			if (interval < 1000)
				interval = 1000;//1 sec
		} 
		else 
		{
			postError("倒计时时间不足，还剩："+ callbackDueIn / 1000 +"秒");
			interval = 1000;//1 sec
		}//By this interval, callbacks will occur discretely between now and callbackDueIn, so that the final actions will be smooth, without lag
		
		var array = this.callerStack;
		var caller;
		for (var i=0; i<array.length; i++) 
		{
			caller = array[i];
			var timer = new Timer(caller.callerObj, caller.callbackFunction, [this.timeDiff]);
			timer.setTimer( (i+1)*interval );//a short delay between reponses to each caller
		}
		array.length = 0;
	},
	checkloginResult:	function(action) 
	{
		if (action.status == SUCCESS) 
		{
			var timer = new Timer(this, this.evaluateStart, []);
			timer.setTimer(1000);//1 sec, not neccessary timer
			return;
		} 
		else if (action.status == ERROR) 
		{
			return;//Terminate
		}
	}
});
//Singleton Instance
TimeDiffManager.EVAL_IN_ADVANCE = 120 * 1000;//caller should call getTimeDiff() at least 120 seconds ahead of actual action.

//alert(document.getElementsByName("input").length);

//TimeDiffManager.EVAL_IN_ADVANCE = document.getElementById('txtEVAL_IN_ADVANCE').value * 1000;

TimeDiffManager.instance = new TimeDiffManager();

//****** end of Class ******