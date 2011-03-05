// So far I must run it with mono (probably 64-bit issue).

using System;
using System.Collections.Generic;
using System.IO;
using System.Net;
using System.Net.Sockets;
using System.Threading;
using xn;

namespace KinectHack
{
	public class Driver
	{
		public static void Main (string [] args)
		{
			new Driver ().Run ();
		}

		public void Run ()
		{
			this.context = new Context (SAMPLE_XML_FILE);

			var ges = context.FindExistingNode (NodeType.Gesture) as GestureGenerator;
			if (ges == null)
				throw new Exception ("Viewer must have a gesture node!");

//foreach (var ggs in ges.EnumerateAllGestures ()) Console.Error.WriteLine (ggs); return;

			this.depth = context.FindExistingNode (NodeType.Depth) as DepthGenerator;
			if (this.depth == null)
				throw new Exception ("Viewer must have a depth node!");

			user_gen = new UserGenerator (context);
			skel_cap = new SkeletonCapability (user_gen);
			pose_cap = new PoseDetectionCapability (user_gen);
			calib_pose = skel_cap.GetCalibrationPose ();

			user_gen.NewUser += delegate (ProductionNode node, uint id) {
				if (user_count++ > 0)
					Console.Error.WriteLine ("WARNING: this application does not recognize more than 1 person");
				else
					pose_cap.StartPoseDetection (calib_pose, id);
			};

			user_gen.LostUser += delegate (ProductionNode node, uint id) {
				user_count--;
				joints.Remove (id);
			};

			pose_cap.PoseDetected += delegate (ProductionNode node, string pose, uint id) {
				pose_cap.StopPoseDetection (id);
				skel_cap.RequestCalibration (id, true);
			};

			skel_cap.CalibrationEnd += delegate (ProductionNode node, uint id, bool success) {
				if (success) {
					skel_cap.StartTracking (id);
					joints.Add (id, new Dictionary<SkeletonJoint, SkeletonJointPosition>());
				} else {
					pose_cap.StartPoseDetection (calib_pose, id);
				}
			};

			skel_cap.SetSkeletonProfile (SkeletonProfile.All);
			joints = new Dictionary<uint,Dictionary<SkeletonJoint,SkeletonJointPosition>> ();
			user_gen.StartGenerating ();

			histogram = new int [this.depth.GetDeviceMaxDepth ()];

			MapOutputMode mapMode = this.depth.GetMapOutputMode ();

			tcp_client = new TcpClient ();
			tcp_client.Connect ("localhost", 9801);
			tcp_writer = new StreamWriter (tcp_client.GetStream ());

//			bitmap = new Bitmap ((int) mapMode.nXRes, (int) mapMode.nYRes/*, System.Drawing.Imaging.PixelFormat.Format24bppRgb*/);
			should_run = true;
			readerThread = new Thread (ReaderThread);
			readerThread.Start ();

			shouldPrintState = false;

			Console.WriteLine ("Type [CR] to stop");
			Console.ReadLine ();
			should_run = false;
		}

		unsafe void ReaderThread ()
		{
			DepthMetaData depthMD = new DepthMetaData ();

			while (should_run) {
				try {
					context.WaitOneUpdateAll (depth);
				} catch (Exception) {
				}

				depth.GetMetaData (depthMD);

				CalcHist (depthMD);

				lock (this) {
/*
					Rectangle rect = new Rectangle (0, 0, bitmap.Width, bitmap.Height);
					BitmapData data = bitmap.LockBits (rect, ImageLockMode.WriteOnly, PixelFormat.Format24bppRgb);

					if (shouldDrawPixels)
					{
						ushort* pDepth = (ushort*) depth.GetDepthMapPtr ().ToPointer ();
						ushort* pLabels = (ushort*) userGenerator.GetUserPixels (0).SceneMapPtr.ToPointer ();

						// set pixels
						for (int y = 0; y < depthMD.YRes; ++y) {
							byte* pDest = (byte*)data.Scan0.ToPointer() + y * data.Stride;
							for (int x = 0; x < depthMD.XRes; ++x, ++pDepth, ++pLabels, pDest += 3) {
								pDest[0] = pDest[1] = pDest[2] = 0;

								ushort label = *pLabels;
								if (this.shouldDrawBackground || *pLabels != 0) {
									Color labelColor = Color.White;
									if (label != 0)
										labelColor = colors[label % ncolors];

									byte pixel = (byte)this.histogram[*pDepth];
									pDest[0] = (byte)(pixel * (labelColor.B / 256.0));
									pDest[1] = (byte)(pixel * (labelColor.G / 256.0));
									pDest[2] = (byte)(pixel * (labelColor.R / 256.0));
								}
							}
						}
					}
					
					bitmap.UnlockBits (data);

					Graphics g = Graphics.FromImage (this.bitmap);
*/

					uint [] users = user_gen.GetUsers ();
					if (users.Length == 0)
						continue;
					uint user = users [0];
					// foreach (uint user in users) {
						if (shouldPrintID) {
							Point3D com = user_gen.GetCoM (user);
							com = depth.ConvertRealWorldToProjective (com);

							string label = "";
							if (!shouldPrintState)
								label += user;
							else if (skel_cap.IsTracking(user))
								label += user + " - Tracking";
							else if (skel_cap.IsCalibrating(user))
								label += user + " - Calibrating...";
							else
								label += user + " - Looking for pose";

/*
							g.DrawString (label, new Font ("Arial", 6), new SolidBrush (anticolors [user % ncolors]), com.X, com.Y);
*/
							if (double.IsNaN (com.X) || double.IsNaN (com.Y) || com.Z == 0)
								continue;
							label = String.Format ("{{x:  {0}, y: {1}, z: {2} }}", com.X, com.Y, com.Z);
							Console.WriteLine (label);
							tcp_writer.Write (label);
							tcp_writer.Flush ();
						}
/*
						if (skel_cap.IsTracking (user))
							DrawSkeleton (g, anticolors [user % ncolors], user);
*/
					// }
//					g.Dispose ();
				}

//				this.Invalidate ();
			}
		}


		unsafe void CalcHist (DepthMetaData depthMD)
		{
			// reset
			for (int i = 0; i < histogram.Length; ++i)
				histogram [i] = 0;

			ushort* pDepth = (ushort*) depthMD.DepthMapPtr.ToPointer();

			int points = 0;
			for (int y = 0; y < depthMD.YRes; ++y) {
				for (int x = 0; x < depthMD.XRes; ++x, ++pDepth) {
					ushort depthVal = *pDepth;
					if (depthVal != 0)
					{
						histogram [depthVal]++;
						points++;
					}
				}
			}

			for (int i = 1; i < histogram.Length; i++) {
				histogram [i] += histogram [i-1];
			}

			if (points > 0)
				for (int i = 1; i < histogram.Length; i++)
					histogram [i] = (int) (256 * (1.0f - (this.histogram [i] / (float) points)));
		}

		const string SAMPLE_XML_FILE = @"SamplesConfig.xml";

		Context context;
		DepthGenerator depth;
		UserGenerator user_gen;
		SkeletonCapability skel_cap;
		PoseDetectionCapability pose_cap;
		string calib_pose;
		Thread readerThread;
		bool should_run;
//		Bitmap bitmap;
		int [] histogram;

		Dictionary<uint, Dictionary<SkeletonJoint, SkeletonJointPosition>> joints;

		bool shouldDrawPixels = true;
		bool shouldDrawBackground = true;
		bool shouldPrintID = true;
		bool shouldPrintState = true;

		TcpClient tcp_client;
		TextWriter tcp_writer;

		int user_count;
	}
}
