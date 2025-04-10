import React from "react";
import { Phone, Facebook } from "lucide-react";
import Link from "next/link";

const Footer: React.FC = () => {
  return (
    <footer className="bg-gradient-to-r from-gray-800 to-gray-900 text-white py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold mb-4 text-yellow-400">
              تواصل معنا
            </h3>
            <div className="space-y-2">
              <p className="flex items-center text-gray-300">
                <Phone className="mr-2" /> 0620005956
              </p>
              <p className="text-gray-400">توصيل مجاني داخل المغرب!</p>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold mb-4 text-yellow-400">
              تابعنا على مواقع التواصل
            </h3>
            <div className="flex gap-4">
              <div >
                <Link
                  href="https://web.facebook.com/profile.php?id=61568845443903"
                  target="_blank"
                  className="text-white hover:text-yellow-400 "
                >
                  <Facebook className="w-6 h-6 " />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
