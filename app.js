/* https://www.npmjs.org/package/node-schedule
 * 0 = Sunday
 * rule.dayOfWeek = [0, new schedule.Range(4, 6)];
 * hour is 24 hour format

 * mydigitalstructure.send(options, data, callback)
 */

var mydigitalstructure = require('./mydigitalstructure');
var sciqual = require('./eca');
var oSettings;

var app = 
{
	pendingAuditsToSetToCE:
	{
		start: function()
		{
			debugger;
			//console.log('About to process automation ' + oAutomation.name);
			sciqual.pendingAuditsToSetToCE.preProcess({settings: oSettings}, 
																sciqual.pendingAuditsToSetToCE.preProcess);
		}

	}
}

mydigitalstructure.init(oSettings, mydigitalstructure.logon, main);

function main(err, data, settings)
{
	//if (mydigitalstructure.data.session.status = "OK")
	oSettings = settings;

	if (data.status === "OK")
	{
		var schedule = require('node-schedule');

		if (oSettings.automations)
		{
			for (var i = 0; i < oSettings.automations.length; i++)
			{

				if (oSettings.local == "true" || oSettings.local == true)
				{
					if (oSettings.automations[i].localRun == "true")
					{
						app[oSettings.automations[i].functionName].start();
					}
				}
				else
				{
					(function(e)
					{
						var oAutomation = oSettings.automations[e];
						mydigitalstructure.data['rule' + oAutomation.id] = new schedule.RecurrenceRule();
						mydigitalstructure.data['rule' + oAutomation.id].dayOfWeek = [
																						new schedule.Range(parseInt(oAutomation.schedule.dayOfWeekRange.start), 
																							parseInt(oAutomation.schedule.dayOfWeekRange.end))
																					];		
						mydigitalstructure.data['rule' + oAutomation.id].hour = parseInt(oAutomation.schedule.hour); 
						mydigitalstructure.data['rule' + oAutomation.id].minute = parseInt(oAutomation.schedule.minute);

						mydigitalstructure.data['schedule' + oAutomation.id] = schedule.scheduleJob(mydigitalstructure.data['rule' + oAutomation.id], 
							function() {app[oAutomation.functionName].start()}
							);
					})(i);
				}
			}
		}
	}	
}
