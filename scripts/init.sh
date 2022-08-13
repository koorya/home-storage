mkdir db_data 
mkdir db_image 

if test -f ".env"; then
	echo ".env exists. Remove it before runing"
	exit
else
	echo DOCKER_UID=$(id -u) >> .env;
	echo DOCKER_GID=$(id -g) >> .env;
	# echo  >> .env;
fi


