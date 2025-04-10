"use client";
import Link from "next/link";
import { motion } from "framer-motion";
import { CheckCircle } from "lucide-react";

const Page = () => {
  return (
    <div className="h-screen flex flex-col justify-center items-center bg-gradient-to-br from-[#1a1d21] to-[#3e3a3a] text-white">
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="max-w-lg text-center bg-gradient-to-br from-yellow-400 to-yellow-600 shadow-xl p-8 rounded-lg"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ duration: 0.6, delay: 0.2, type: "spring" }}
          className="flex justify-center mb-4"
        >
          <CheckCircle className="w-16 h-16 text-green-700" />
        </motion.div>
        <motion.h1
          initial={{ y: -20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6 }}
          className="text-3xl font-extrabold tracking-tight text-white"
        >
          شكراً لطلبك!
        </motion.h1>
        <motion.p
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="mt-4 text-lg text-gray-100"
        >
          تم استلام طلبك بنجاح. نحن الآن نقوم بمعالجة طلبك وسيتم إبلاغك بتحديثات
          الطلب قريبًا.
        </motion.p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        className="mt-6"
      >
        <Link
          href="/"
          className="inline-block px-10 py-3 bg-gradient-to-r from-[#c8963e] to-[#d4a759] text-white font-semibold rounded-full shadow-lg hover:opacity-90 transition-transform transform hover:scale-105"
        >
          العودة إلى الصفحة الرئيسية
        </Link>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1 }}
        className="mt-16 text-center"
      >
        <p className="text-gray-400 text-sm">
          إذا كانت لديك أي استفسارات، لا تتردد في{" "}
          <Link
            href="https://wa.me/212620005956"
            target="_blank"
            rel="noopener noreferrer"
            className="text-yellow-400 underline hover:text-yellow-500"
          >
            التواصل معنا
          </Link>
          .
        </p>
      </motion.div>
    </div>
  );
};

export default Page;
